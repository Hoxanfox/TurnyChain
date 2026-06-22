package domain

import "github.com/google/uuid"

type WaiterApprovedStat struct {
	Period        string    `json:"period"`
	WaiterID      uuid.UUID `json:"waiter_id"`
	WaiterName    string    `json:"waiter_name"`
	ApprovedCount int       `json:"approved_count"`
	TotalAmount   float64   `json:"total_amount"`
}
