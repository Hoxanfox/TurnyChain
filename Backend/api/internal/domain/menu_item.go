// =================================================================
// ARCHIVO 2: /internal/domain/menu_item.go (ACTUALIZADO)
// =================================================================
package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
)

type Modifiers map[string][]string

func (m Modifiers) Value() (driver.Value, error) {
	if len(m) == 0 { return nil, nil }
	return json.Marshal(m)
}

func (m *Modifiers) Scan(value interface{}) error {
	if value == nil {
		*m = nil
		return nil
	}
	b, ok := value.([]byte)
	if !ok { return errors.New("type assertion to []byte failed") }
	return json.Unmarshal(b, &m)
}

type MenuItem struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Price       float64   `json:"price" db:"price"`
	Category    string    `json:"category" db:"category"`
	IsAvailable bool      `json:"is_available" db:"is_available"`
	Modifiers   Modifiers `json:"modifiers" db:"modifiers"`
}