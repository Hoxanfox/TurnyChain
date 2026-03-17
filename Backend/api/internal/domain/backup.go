package domain

import (
	"time"

	"github.com/google/uuid"
)

// BackupUser evita exponer password_hash en exportaciones de respaldo.
type BackupUser struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Role     string    `json:"role"`
	IsActive bool      `json:"is_active"`
}

// BackupMenuItem conserva las relaciones por IDs para facilitar restauraciones.
type BackupMenuItem struct {
	ID               uuid.UUID   `json:"id"`
	Name             string      `json:"name"`
	Description      string      `json:"description"`
	Price            float64     `json:"price"`
	CategoryID       uuid.UUID   `json:"category_id"`
	IsAvailable      bool        `json:"is_available"`
	OrderCount       int         `json:"order_count"`
	IngredientIDs    []uuid.UUID `json:"ingredient_ids"`
	AccompanimentIDs []uuid.UUID `json:"accompaniment_ids"`
}

type CatalogBackup struct {
	Version        string           `json:"version"`
	GeneratedAt    time.Time        `json:"generated_at"`
	Users          []BackupUser     `json:"users"`
	Tables         []Table          `json:"tables"`
	Stations       []Station        `json:"stations"`
	Printers       []Printer        `json:"printers"`
	Categories     []Category       `json:"categories"`
	Ingredients    []Ingredient     `json:"ingredients"`
	Accompaniments []Accompaniment  `json:"accompaniments"`
	MenuItems      []BackupMenuItem `json:"menu_items"`
}

type CatalogRestoreResult struct {
	TablesImported              int    `json:"tables_imported"`
	StationsImported            int    `json:"stations_imported"`
	PrintersImported            int    `json:"printers_imported"`
	CategoriesImported          int    `json:"categories_imported"`
	IngredientsImported         int    `json:"ingredients_imported"`
	AccompanimentsImported      int    `json:"accompaniments_imported"`
	MenuItemsImported           int    `json:"menu_items_imported"`
	MenuIngredientLinksImported int    `json:"menu_ingredient_links_imported"`
	MenuAccompanimentLinksCount int    `json:"menu_accompaniment_links_imported"`
	UsersSkipped                int    `json:"users_skipped"`
	Warning                     string `json:"warning,omitempty"`
}
