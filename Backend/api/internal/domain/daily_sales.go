package domain

// DailySalesStat representa las ventas agregadas de un día (órdenes pagadas).
type DailySalesStat struct {
	Date       string  `json:"date"`        // Formato YYYY-MM-DD (hora Bogotá)
	Total      float64 `json:"total"`       // Suma de o.total
	OrderCount int     `json:"order_count"` // Cantidad de órdenes pagadas
}

type MonthlySalesStat struct {
	Month      string  `json:"month"`
	Total      float64 `json:"total"`
	OrderCount int     `json:"order_count"`
}

type YearlySalesStat struct {
	Year       string  `json:"year"`
	Total      float64 `json:"total"`
	OrderCount int     `json:"order_count"`
}
