package domain

import "github.com/google/uuid"

type StockItem struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	CategoryID    uuid.UUID `json:"category_id"`
	CategoryName  string    `json:"category_name"`
	Quantity      float64   `json:"quantity"`
}
