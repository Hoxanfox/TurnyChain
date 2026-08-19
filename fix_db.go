package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgresql://restaurant_admin:tu_password_seguro_aqui_2024@127.0.0.1:5432/restaurant_db?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec(`ALTER TABLE printers ADD COLUMN print_layout jsonb NOT NULL DEFAULT '["header", "order_info", "items", "totals", "notes", "footer"]';`)
	if err != nil {
		log.Fatal("Error adding column:", err)
	}
	fmt.Println("Successfully added print_layout column.")
}
