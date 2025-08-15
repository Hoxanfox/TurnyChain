// =================================================================
// ARCHIVO 4: /internal/repository/accompaniment_repository.go (NUEVO)
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type AccompanimentRepository interface {
	Create(name string, price float64) (*domain.Accompaniment, error)
	GetAll() ([]domain.Accompaniment, error)
	Update(id uuid.UUID, name string, price float64) (*domain.Accompaniment, error)
	Delete(id uuid.UUID) error
}

type accompanimentRepository struct { db *sql.DB }
func NewAccompanimentRepository(db *sql.DB) AccompanimentRepository { return &accompanimentRepository{db: db} }

func (r *accompanimentRepository) Create(name string, price float64) (*domain.Accompaniment, error) {
	acc := &domain.Accompaniment{ID: uuid.New(), Name: name, Price: price}
	query := "INSERT INTO accompaniments (id, name, price) VALUES ($1, $2, $3) RETURNING id"
	err := r.db.QueryRow(query, acc.ID, acc.Name, acc.Price).Scan(&acc.ID)
	return acc, err
}

func (r *accompanimentRepository) GetAll() ([]domain.Accompaniment, error) {
	rows, err := r.db.Query("SELECT id, name, price FROM accompaniments")
	if err != nil { return nil, err }
	defer rows.Close()
	
	// CORRECCIÓN: Inicializamos la slice.
	accompaniments := make([]domain.Accompaniment, 0)
	for rows.Next() {
		var acc domain.Accompaniment
		if err := rows.Scan(&acc.ID, &acc.Name, &acc.Price); err != nil { return nil, err }
		accompaniments = append(accompaniments, acc)
	}
	return accompaniments, nil
}

func (r *accompanimentRepository) Update(id uuid.UUID, name string, price float64) (*domain.Accompaniment, error) {
	acc := &domain.Accompaniment{ID: id, Name: name, Price: price}
	query := "UPDATE accompaniments SET name = $1, price = $2 WHERE id = $3 RETURNING id, name, price"
	err := r.db.QueryRow(query, acc.Name, acc.Price, acc.ID).Scan(&acc.ID, &acc.Name, &acc.Price)
	return acc, err
}

func (r *accompanimentRepository) Delete(id uuid.UUID) error {
	query := "DELETE FROM accompaniments WHERE id = $1"
	_, err := r.db.Exec(query, id)
	return err
}