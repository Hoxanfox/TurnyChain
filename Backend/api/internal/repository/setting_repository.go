package repository

import (
	"database/sql"
	"errors"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
)

type SettingRepository interface {
	GetSetting(key string) (*domain.Setting, error)
	GetAllSettings() ([]domain.Setting, error)
	UpsertSetting(key string, value string) error
}

type postgresSettingRepository struct {
	db *sql.DB
}

func NewSettingRepository(db *sql.DB) SettingRepository {
	return &postgresSettingRepository{db: db}
}

func (r *postgresSettingRepository) GetSetting(key string) (*domain.Setting, error) {
	query := "SELECT key, value, updated_at FROM settings WHERE key = $1"
	row := r.db.QueryRow(query, key)

	var s domain.Setting
	err := row.Scan(&s.Key, &s.Value, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Return nil if setting is not found
		}
		return nil, err
	}
	return &s, nil
}

func (r *postgresSettingRepository) GetAllSettings() ([]domain.Setting, error) {
	query := "SELECT key, value, updated_at FROM settings"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settings []domain.Setting
	for rows.Next() {
		var s domain.Setting
		if err := rows.Scan(&s.Key, &s.Value, &s.UpdatedAt); err != nil {
			return nil, err
		}
		settings = append(settings, s)
	}
	return settings, nil
}

func (r *postgresSettingRepository) UpsertSetting(key string, value string) error {
	query := `
		INSERT INTO settings (key, value, updated_at) 
		VALUES ($1, $2, now()) 
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
	`
	_, err := r.db.Exec(query, key, value)
	return err
}
