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

	// 1. Crear factura optimizada para blockchain (solo datos esenciales)
	invoice := domain.CreateBlockchainInvoice(order)

	// 2. Convertir factura a JSON y Encriptar
	invoiceJSON, _ := json.Marshal(invoice)
	encryptedData, err := utils.Encrypt(string(invoiceJSON))
	if err != nil {
		return "", err
	}

	// Log del tamaño reducido
	log.Printf("📊 Factura optimizada: %d bytes (vs orden completa: estimado ~%d bytes)",
		len(invoiceJSON), len(invoiceJSON)*3)

	// 2. Empaquetar datos para el contrato
	data, err := s.parsedABI.Pack("notarize", order.ID.String(), encryptedData)
	if err != nil {
		return "", err
	}

	// 3. Preparar transacción
	publicKey := s.privateKey.Public()
	publicKeyECDSA, _ := publicKey.(*ecdsa.PublicKey)
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	nonce, _ := s.client.PendingNonceAt(context.Background(), fromAddress)
	gasPrice, _ := s.client.SuggestGasPrice(context.Background())

	tx := types.NewTransaction(nonce, s.contractAddress, big.NewInt(0), 500000, gasPrice, data)
	signedTx, _ := types.SignTx(tx, types.NewEIP155Signer(s.chainID), s.privateKey)

	// 4. Enviar con timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = s.client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", err
	}

	log.Printf("⛓️ Factura %d notariada. Hash: %d", order.TableNumber, signedTx.Hash().Hex())
	return signedTx.Hash().Hex(), nil
}
