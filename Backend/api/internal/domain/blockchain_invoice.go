// =================================================================
// ARCHIVO: /internal/domain/blockchain_invoice.go
// Estructuras optimizadas para enviar a blockchain
// =================================================================
package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// BlockchainInvoice representa una factura optimizada para blockchain
// Solo contiene la información esencial para certificar la transacción
type BlockchainInvoice struct {
	OrderID     uuid.UUID        `json:"order_id"`
	WaiterID    uuid.UUID        `json:"waiter_id"`
	WaiterName  string           `json:"waiter_name"`
	CashierID   *uuid.UUID       `json:"cashier_id,omitempty"`
	TableNumber int              `json:"table_number"`
	Total       float64          `json:"total"`
	Items       []BlockchainItem `json:"items"`
	Timestamp   time.Time        `json:"timestamp"`
	Hash        string           `json:"hash"` // Hash para verificación de integridad
}

// BlockchainItem representa un item de menú optimizado para blockchain
// Solo IDs y datos esenciales, no objetos completos
type BlockchainItem struct {
	MenuItemID                uuid.UUID   `json:"menu_item_id"`
	MenuItemName              string      `json:"menu_item_name"`
	Quantity                  int         `json:"quantity"`
	PriceAtOrder              float64     `json:"price_at_order"`
	ActiveIngredientsIDs      []uuid.UUID `json:"active_ingredients_ids,omitempty"`      // Ingredientes que SÍ lleva
	SelectedAccompanimentsIDs []uuid.UUID `json:"selected_accompaniments_ids,omitempty"` // Acompañamientos que SÍ lleva
	Notes                     *string     `json:"notes,omitempty"`
}

// CreateBlockchainInvoice convierte una Order completa en una BlockchainInvoice optimizada
func CreateBlockchainInvoice(order *Order) *BlockchainInvoice {
	// Convertir items
	items := make([]BlockchainItem, len(order.Items))
	for i, item := range order.Items {
		// Extraer solo IDs de ingredientes activos (los que SÍ lleva)
		activeIngredientsIDs := make([]uuid.UUID, 0)
		for _, ing := range item.Customizations.ActiveIngredients {
			activeIngredientsIDs = append(activeIngredientsIDs, ing.ID)
		}

		// Extraer solo IDs de acompañantes seleccionados (los que SÍ lleva)
		selectedAccompanimentsIDs := make([]uuid.UUID, 0)
		for _, acc := range item.Customizations.SelectedAccompaniments {
			selectedAccompanimentsIDs = append(selectedAccompanimentsIDs, acc.ID)
		}

		items[i] = BlockchainItem{
			MenuItemID:                item.MenuItemID,
			MenuItemName:              item.MenuItemName,
			Quantity:                  item.Quantity,
			PriceAtOrder:              item.PriceAtOrder,
			ActiveIngredientsIDs:      activeIngredientsIDs,
			SelectedAccompanimentsIDs: selectedAccompanimentsIDs,
			Notes:                     item.Notes,
		}
	}

	invoice := &BlockchainInvoice{
		OrderID:     order.ID,
		WaiterID:    order.WaiterID,
		WaiterName:  order.WaiterName,
		CashierID:   order.CashierID,
		TableNumber: order.TableNumber,
		Total:       order.Total,
		Items:       items,
		Timestamp:   order.UpdatedAt,
	}

	// Calcular hash para integridad
	invoice.Hash = invoice.CalculateHash()

	return invoice
}

// CalculateHash genera un hash SHA256 de la factura para verificación de integridad
func (bi *BlockchainInvoice) CalculateHash() string {
	// Crear una copia temporal sin el hash para calcular
	temp := *bi
	temp.Hash = ""

	// Serializar a JSON
	data, _ := json.Marshal(temp)

	// Calcular hash
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// VerifyHash verifica si el hash de la factura es válido
func (bi *BlockchainInvoice) VerifyHash() bool {
	currentHash := bi.Hash
	calculatedHash := bi.CalculateHash()
	return currentHash == calculatedHash
}
