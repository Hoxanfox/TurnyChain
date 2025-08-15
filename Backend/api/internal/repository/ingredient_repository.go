// =================================================================
// ARCHIVO 1: /internal/repository/ingredient_repository.go (NUEVO)
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type IngredientRepository interface {
	Create(name string) (*domain.Ingredient, error)
	GetAll() ([]domain.Ingredient, error)
	Update(id uuid.UUID, name string) (*domain.Ingredient, error)
	Delete(id uuid.UUID) error
}

type ingredientRepository struct { db *sql.DB }
func NewIngredientRepository(db *sql.DB) IngredientRepository { return &ingredientRepository{db: db} }

func (r *ingredientRepository) Create(name string) (*domain.Ingredient, error) {
	ingredient := &domain.Ingredient{ID: uuid.New(), Name: name}
	query := "INSERT INTO ingredients (id, name) VALUES ($1, $2) RETURNING id"
	err := r.db.QueryRow(query, ingredient.ID, ingredient.Name).Scan(&ingredient.ID)
	return ingredient, err
}

func (r *ingredientRepository) GetAll() ([]domain.Ingredient, error) {
	rows, err := r.db.Query("SELECT id, name FROM ingredients")
	if err != nil { return nil, err }
	defer rows.Close()
	
	// CORRECCIÓN: Inicializamos la slice.
	ingredients := make([]domain.Ingredient, 0)
	for rows.Next() {
		var ingredient domain.Ingredient
		if err := rows.Scan(&ingredient.ID, &ingredient.Name); err != nil { return nil, err }
		ingredients = append(ingredients, ingredient)
	}
	return ingredients, nil
}

func (r *ingredientRepository) Update(id uuid.UUID, name string) (*domain.Ingredient, error) {
	ingredient := &domain.Ingredient{ID: id, Name: name}
	query := "UPDATE ingredients SET name = $1 WHERE id = $2 RETURNING id, name"
	err := r.db.QueryRow(query, ingredient.Name, ingredient.ID).Scan(&ingredient.ID, &ingredient.Name)
	return ingredient, err
}

func (r *ingredientRepository) Delete(id uuid.UUID) error {
	query := "DELETE FROM ingredients WHERE id = $1"
	_, err := r.db.Exec(query, id)
	return err
}