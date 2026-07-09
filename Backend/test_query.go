package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgresql://restaurant_admin:tu_password_seguro_aqui_2024@localhost:5432/restaurant_db?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	start := time.Now().Add(-48 * time.Hour)
	end := time.Now().Add(48 * time.Hour)

	query := `
		SELECT 
			oi.menu_item_id as product_id,
			m.name as product_name,
			COALESCE(c.name, 'Sin Categoría') as category_name,
			SUM(oi.quantity) as total_quantity,
			SUM(oi.quantity * oi.price_at_order) as total_revenue
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		JOIN menu_items m ON oi.menu_item_id = m.id
		LEFT JOIN categories c ON m.category_id = c.id
		WHERE o.status = 'pagado'
		  AND o.updated_at >= $1
		  AND o.updated_at < $2
		GROUP BY oi.menu_item_id, m.name, c.name
		ORDER BY total_quantity DESC
	`

	rows, err := db.Query(query, start, end)
	if err != nil {
		log.Fatalf("Query err: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var productID, productName, categoryName string
		var totalQuantity int
		var totalRevenue float64
		if err := rows.Scan(&productID, &productName, &categoryName, &totalQuantity, &totalRevenue); err != nil {
			log.Fatalf("Scan err: %v", err)
		}
		fmt.Printf("%s - %d - %f\n", productName, totalQuantity, totalRevenue)
	}
	if err := rows.Err(); err != nil {
		log.Fatalf("Rows err: %v", err)
	}
	fmt.Println("Done")
}
