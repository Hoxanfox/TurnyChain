// =================================================================
// ARCHIVO: /internal/repository/session_repository.go (NUEVO)
// =================================================================
package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type SessionRepository interface {
	RevokeActiveSessions(userID uuid.UUID, reason string) error
	CreateSession(userID uuid.UUID, deviceID *string, expiresAt time.Time) (uuid.UUID, error)
	IsSessionActive(sessionID uuid.UUID, userID uuid.UUID, now time.Time) (bool, error)
}

type sessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) RevokeActiveSessions(userID uuid.UUID, reason string) error {
	query := `UPDATE user_sessions
		SET revoked_at = NOW(), revoked_reason = $2
		WHERE user_id = $1 AND revoked_at IS NULL`
	_, err := r.db.Exec(query, userID, reason)
	return err
}

func (r *sessionRepository) CreateSession(userID uuid.UUID, deviceID *string, expiresAt time.Time) (uuid.UUID, error) {
	sessionID := uuid.New()
	query := `INSERT INTO user_sessions (id, user_id, device_id, expires_at)
		VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(query, sessionID, userID, deviceID, expiresAt)
	return sessionID, err
}

func (r *sessionRepository) IsSessionActive(sessionID uuid.UUID, userID uuid.UUID, now time.Time) (bool, error) {
	var expiresAt time.Time
	var revokedAt sql.NullTime

	query := `SELECT expires_at, revoked_at
		FROM user_sessions
		WHERE id = $1 AND user_id = $2`
	err := r.db.QueryRow(query, sessionID, userID).Scan(&expiresAt, &revokedAt)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if revokedAt.Valid {
		return false, nil
	}
	if !expiresAt.After(now) {
		_, _ = r.db.Exec(`UPDATE user_sessions
			SET revoked_at = NOW(), revoked_reason = 'expired'
			WHERE id = $1 AND revoked_at IS NULL`, sessionID)
		return false, nil
	}

	return true, nil
}
