// =================================================================
// ARCHIVO 5: /internal/repository/category_repository.go
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type CategoryRepository interface {
	Create(name string) (*domain.Category, error)
	GetAll() ([]domain.Category, error)
	Update(id uuid.UUID, name string) (*domain.Category, error)
	Delete(id uuid.UUID) error
}

type categoryRepository struct { db *sql.DB }
func NewCategoryRepository(db *sql.DB) CategoryRepository { return &categoryRepository{db: db} }

func (r *categoryRepository) Create(name string) (*domain.Category, error) {
	cat := &domain.Category{ID: uuid.New(), Name: name}
	query := "INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING id"
	err := r.db.QueryRow(query, cat.ID, cat.Name).Scan(&cat.ID)
	return cat, err
}

func (r *categoryRepository) GetAll() ([]domain.Category, error) {
	rows, err := r.db.Query("SELECT id, name FROM categories")
	if err != nil { return nil, err }
	defer rows.Close()
	
	// CORRECCIÓN: Inicializamos la slice para que nunca sea nil.
	categories := make([]domain.Category, 0)
	for rows.Next() {
		var cat domain.Category
		if err := rows.Scan(&cat.ID, &cat.Name); err != nil { return nil, err }
		categories = append(categories, cat)
	}
	return categories, nil
}

func (r *categoryRepository) Update(id uuid.UUID, name string) (*domain.Category, error) {
	cat := &domain.Category{ID: id, Name: name}
	query := "UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name"
	err := r.db.QueryRow(query, cat.Name, cat.ID).Scan(&cat.ID, &cat.Name)
	return cat, err
}

func (r *categoryRepository) Delete(id uuid.UUID) error {
	query := "DELETE FROM categories WHERE id = $1"
	_, err := r.db.Exec(query, id)
	return err
}