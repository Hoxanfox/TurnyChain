// =================================================================
// ARCHIVO 5: /internal/repository/menu_repository.go (CORREGIDO)
// =================================================================
package repository

import (
	"database/sql"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type MenuRepository interface {
	CreateMenuItem(item *domain.MenuItem, ingredientIDs, accompanimentIDs []uuid.UUID) (*domain.MenuItem, error)
	GetMenuItems() ([]domain.MenuItem, error)
	GetMenuItemDetails(menuItemID uuid.UUID) ([]domain.Ingredient, []domain.Accompaniment, error)
	UpdateMenuItem(item *domain.MenuItem, ingredientIDs, accompanimentIDs []uuid.UUID) (*domain.MenuItem, error)
	DeleteMenuItem(itemID uuid.UUID) error
}

type menuRepository struct{ db *sql.DB }

func NewMenuRepository(db *sql.DB) MenuRepository { return &menuRepository{db: db} }

func (r *menuRepository) CreateMenuItem(item *domain.MenuItem, ingredientIDs, accompanimentIDs []uuid.UUID) (*domain.MenuItem, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}

	item.ID = uuid.New()
	query := `INSERT INTO menu_items (id, name, description, price, category_id, is_available) 
			  VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
	err = tx.QueryRow(query, item.ID, item.Name, item.Description, item.Price, item.CategoryID, item.IsAvailable).Scan(&item.ID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	for _, ingID := range ingredientIDs {
		_, err := tx.Exec("INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES ($1, $2)", item.ID, ingID)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	for _, accID := range accompanimentIDs {
		_, err := tx.Exec("INSERT INTO menu_item_accompaniments (menu_item_id, accompaniment_id) VALUES ($1, $2)", item.ID, accID)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	return item, tx.Commit()
}

// GetMenuItems ahora obtiene los ítems y sus relaciones
func (r *menuRepository) GetMenuItems() ([]domain.MenuItem, error) {
	query := "SELECT id, name, description, price, category_id, is_available FROM menu_items WHERE is_available = true"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	itemsMap := make(map[uuid.UUID]*domain.MenuItem)
	var itemIDs []uuid.UUID

	for rows.Next() {
		var item domain.MenuItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Price, &item.CategoryID, &item.IsAvailable); err != nil {
			return nil, err
		}
		itemsMap[item.ID] = &item
		itemIDs = append(itemIDs, item.ID)
	}

	if len(itemIDs) == 0 {
		return []domain.MenuItem{}, nil
	}

	// Lógica para obtener ingredientes y acompañantes (simplificada)
	// En una aplicación real, esto se haría de forma más eficiente.
	for id, item := range itemsMap {
		// Get Ingredients
		ingRows, _ := r.db.Query("SELECT i.id, i.name FROM ingredients i JOIN menu_item_ingredients mii ON i.id = mii.ingredient_id WHERE mii.menu_item_id = $1", id)
		var ingredients []domain.Ingredient
		for ingRows.Next() {
			var ing domain.Ingredient
			ingRows.Scan(&ing.ID, &ing.Name)
			ingredients = append(ingredients, ing)
		}
		item.Ingredients = ingredients
		ingRows.Close()

		// Get Accompaniments
		accRows, _ := r.db.Query("SELECT a.id, a.name, a.price FROM accompaniments a JOIN menu_item_accompaniments mia ON a.id = mia.accompaniment_id WHERE mia.menu_item_id = $1", id)
		var accompaniments []domain.Accompaniment
		for accRows.Next() {
			var acc domain.Accompaniment
			accRows.Scan(&acc.ID, &acc.Name, &acc.Price)
			accompaniments = append(accompaniments, acc)
		}
		item.Accompaniments = accompaniments
		accRows.Close()
	}

	finalItems := make([]domain.MenuItem, 0, len(itemsMap))
	for _, item := range itemsMap {
		finalItems = append(finalItems, *item)
	}

	return finalItems, nil
}

// GetMenuItemDetails obtiene todos los ingredientes y acompañantes de un menu item específico
func (r *menuRepository) GetMenuItemDetails(menuItemID uuid.UUID) ([]domain.Ingredient, []domain.Accompaniment, error) {
	// Obtener ingredientes
	ingRows, err := r.db.Query(`
		SELECT i.id, i.name 
		FROM ingredients i 
		JOIN menu_item_ingredients mii ON i.id = mii.ingredient_id 
		WHERE mii.menu_item_id = $1`, menuItemID)
	if err != nil {
		return nil, nil, err
	}
	defer ingRows.Close()

	ingredients := make([]domain.Ingredient, 0)
	for ingRows.Next() {
		var ing domain.Ingredient
		if err := ingRows.Scan(&ing.ID, &ing.Name); err != nil {
			return nil, nil, err
		}
		ingredients = append(ingredients, ing)
	}

	// Obtener acompañantes
	accRows, err := r.db.Query(`
		SELECT a.id, a.name, a.price 
		FROM accompaniments a 
		JOIN menu_item_accompaniments mia ON a.id = mia.accompaniment_id 
		WHERE mia.menu_item_id = $1`, menuItemID)
	if err != nil {
		return nil, nil, err
	}
	defer accRows.Close()

	accompaniments := make([]domain.Accompaniment, 0)
	for accRows.Next() {
		var acc domain.Accompaniment
		if err := accRows.Scan(&acc.ID, &acc.Name, &acc.Price); err != nil {
			return nil, nil, err
		}
		accompaniments = append(accompaniments, acc)
	}

	return ingredients, accompaniments, nil
}

func (r *menuRepository) UpdateMenuItem(item *domain.MenuItem, ingredientIDs, accompanimentIDs []uuid.UUID) (*domain.MenuItem, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}

	query := `UPDATE menu_items SET name = $1, description = $2, price = $3, category_id = $4 
              WHERE id = $5 RETURNING id, name, description, price, category_id, is_available`
	err = tx.QueryRow(query, item.Name, item.Description, item.Price, item.CategoryID, item.ID).Scan(
		&item.ID, &item.Name, &item.Description, &item.Price, &item.CategoryID, &item.IsAvailable,
	)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Limpiar asociaciones antiguas
	_, err = tx.Exec("DELETE FROM menu_item_ingredients WHERE menu_item_id = $1", item.ID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	_, err = tx.Exec("DELETE FROM menu_item_accompaniments WHERE menu_item_id = $1", item.ID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Insertar nuevas asociaciones
	for _, ingID := range ingredientIDs {
		_, err := tx.Exec("INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES ($1, $2)", item.ID, ingID)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}
	for _, accID := range accompanimentIDs {
		_, err := tx.Exec("INSERT INTO menu_item_accompaniments (menu_item_id, accompaniment_id) VALUES ($1, $2)", item.ID, accID)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	return nil, nil // Placeholder
}

func (r *menuRepository) DeleteMenuItem(itemID uuid.UUID) error {
	query := "UPDATE menu_items SET is_available = false WHERE id = $1"
	_, err := r.db.Exec(query, itemID)
	return err
}
