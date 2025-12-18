package service

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/utils"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// ABI mínimo del contrato para la función 'notarize'
const contractABIJSON = `[{"inputs":[{"internalType":"string","name":"_orderId","type":"string"},{"internalType":"string","name":"_encryptedData","type":"string"}],"name":"notarize","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

type BlockchainService interface {
	NotarizeOrder(order *domain.Order) (string, error)
}

type blockchainService struct {
	client          *ethclient.Client
	privateKey      *ecdsa.PrivateKey
	contractAddress common.Address
	parsedABI       abi.ABI
	chainID         *big.Int
}

func NewBlockchainService(rpcURL, privateKeyHex, contractAddr string) BlockchainService {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Printf("⚠️ No se pudo conectar a Blockchain (RPC: %s): %v", rpcURL, err)
		return nil
	}

	if strings.HasPrefix(privateKeyHex, "0x") {
		privateKeyHex = privateKeyHex[2:]
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		log.Printf("⚠️ Error cargando llave privada: %v", err)
		return nil
	}

	parsedABI, _ := abi.JSON(strings.NewReader(contractABIJSON))

	// Obtenemos el ChainID (Anvil suele ser 31337)
	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Printf("⚠️ Error obteniendo NetworkID: %v", err)
		return nil
	}

	log.Println("✅ Servicio Blockchain conectado exitosamente")
	return &blockchainService{
		client:          client,
		privateKey:      privateKey,
		contractAddress: common.HexToAddress(contractAddr),
		parsedABI:       parsedABI,
		chainID:         chainID,
	}
}

func (s *blockchainService) NotarizeOrder(order *domain.Order) (string, error) {
	if s == nil || s.client == nil {
		return "", fmt.Errorf("servicio blockchain no disponible")
	}

	ctx := context.Background()

	// 1. Crear factura optimizada para blockchain (solo datos esenciales)
	invoice := domain.CreateBlockchainInvoice(order)

	// 2. Convertir factura a JSON y Encriptar
	invoiceJSON, _ := json.Marshal(invoice)
	encryptedData, err := utils.Encrypt(string(invoiceJSON))
	if err != nil {
		return "", err
	}

	// Log del tamaño de la factura
	log.Printf("📊 Factura optimizada: %d bytes (encriptada: %d bytes)",
		len(invoiceJSON), len(encryptedData))

	// 3. Empaquetar datos para el contrato
	data, err := s.parsedABI.Pack("notarize", order.ID.String(), encryptedData)
	if err != nil {
		return "", err
	}

	// 4. Obtener dirección del remitente
	publicKey := s.privateKey.Public()
	publicKeyECDSA, _ := publicKey.(*ecdsa.PublicKey)
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// 5. Obtener nonce
	nonce, err := s.client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", fmt.Errorf("error obteniendo nonce: %v", err)
	}

	// 6. CALCULAR PRECIO DEL GAS DINÁMICAMENTE (EIP-1559)
	// Obtener BaseFee del último bloque
	head, err := s.client.HeaderByNumber(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("error obteniendo header del bloque: %v", err)
	}

	baseFee := head.BaseFee
	if baseFee == nil {
		// Fallback para redes que no soportan EIP-1559
		baseFee = big.NewInt(0)
	}

	// Obtener tip sugerido (propina para el minero)
	tipCap, err := s.client.SuggestGasTipCap(ctx)
	if err != nil {
		return "", fmt.Errorf("error obteniendo gas tip: %v", err)
	}

	// Calcular MaxFeePerGas = (BaseFee * 2) + Tip
	// El multiplicador de 2 da un colchón del 100% para variaciones del baseFee
	maxFeePerGas := new(big.Int).Add(
		new(big.Int).Mul(baseFee, big.NewInt(2)),
		tipCap,
	)

	log.Printf("⛽ BaseFee: %s | Tip: %s | MaxFee: %s",
		baseFee.String(), tipCap.String(), maxFeePerGas.String())

	// 7. ESTIMAR GAS SEGÚN EL TAMAÑO DE LA FACTURA
	// Crear mensaje de simulación
	msg := ethereum.CallMsg{
		From:      fromAddress,
		To:        &s.contractAddress,
		Data:      data,
		GasFeeCap: maxFeePerGas,
		GasTipCap: tipCap,
	}

	estimatedGas, err := s.client.EstimateGas(ctx, msg)
	if err != nil {
		return "", fmt.Errorf("falló la estimación de gas (posiblemente la factura es muy grande o hay error en contrato): %v", err)
	}

	// Agregar 20% de margen de seguridad al gas estimado
	gasLimit := estimatedGas + (estimatedGas / 5)

	log.Printf("⛽ Gas Estimado: %d | Gas Limit (con margen): %d | Precio Max: %s wei",
		estimatedGas, gasLimit, maxFeePerGas.String())

	// 8. Crear transacción EIP-1559 (DynamicFeeTx)
	tx := types.NewTx(&types.DynamicFeeTx{
		ChainID:   s.chainID,
		Nonce:     nonce,
		GasTipCap: tipCap,
		GasFeeCap: maxFeePerGas,
		Gas:       gasLimit,
		To:        &s.contractAddress,
		Value:     big.NewInt(0),
		Data:      data,
	})

	// 9. Firmar transacción
	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(s.chainID), s.privateKey)
	if err != nil {
		return "", fmt.Errorf("error firmando transacción: %v", err)
	}

	// 10. Enviar transacción con timeout
	sendCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	err = s.client.SendTransaction(sendCtx, signedTx)
	if err != nil {
		return "", fmt.Errorf("❌ Error Blockchain: %v", err)
	}

	txHash := signedTx.Hash().Hex()
	log.Printf("✅ Factura Mesa %d notarizada. Hash: %s", order.TableNumber, txHash)
	return txHash, nil
}
