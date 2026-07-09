package domain

import "github.com/google/uuid"

type ProductSalesStat struct {
	ProductID    uuid.UUID `json:"product_id" db:"product_id"`
	ProductName  string    `json:"product_name" db:"product_name"`
	CategoryName string    `json:"category_name" db:"category_name"`
	TotalQuantity int      `json:"total_quantity" db:"total_quantity"`
	TotalRevenue float64   `json:"total_revenue" db:"total_revenue"`
}
