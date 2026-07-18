package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
	"time"
)

type AttendanceRepository interface {
	CreateRecord(record *domain.AttendanceRecord) (*domain.AttendanceRecord, error)
	GetRecordsByEmployee(employeeID uuid.UUID, date time.Time) ([]domain.AttendanceRecord, error)
	GetTodayRecords() ([]domain.AttendanceRecord, error)
	GetRecordsByDate(date time.Time) ([]domain.AttendanceRecord, error)
	GetRecordsByDateRange(start, end time.Time) ([]domain.AttendanceRecord, error)
	UpdateTodayArrival(employeeID uuid.UUID, newTime time.Time) error
}

type attendanceRepository struct {
	db *sql.DB
}

func NewAttendanceRepository(db *sql.DB) AttendanceRepository {
	return &attendanceRepository{db: db}
}

func (r *attendanceRepository) CreateRecord(record *domain.AttendanceRecord) (*domain.AttendanceRecord, error) {
	record.ID = uuid.New()
	if record.Timestamp.IsZero() {
		record.Timestamp = time.Now()
	}
	query := "INSERT INTO attendance_records (id, employee_id, action, timestamp) VALUES ($1, $2, $3, $4) RETURNING id"
	err := r.db.QueryRow(query, record.ID, record.EmployeeID, record.Action, record.Timestamp).Scan(&record.ID)
	if err != nil {
		return nil, err
	}
	return record, nil
}

func (r *attendanceRepository) GetRecordsByEmployee(employeeID uuid.UUID, date time.Time) ([]domain.AttendanceRecord, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	query := "SELECT id, employee_id, action, timestamp FROM attendance_records WHERE employee_id = $1 AND timestamp >= $2 AND timestamp < $3 ORDER BY timestamp ASC"
	rows, err := r.db.Query(query, employeeID, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var rec domain.AttendanceRecord
		if err := rows.Scan(&rec.ID, &rec.EmployeeID, &rec.Action, &rec.Timestamp); err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, nil
}

func (r *attendanceRepository) GetTodayRecords() ([]domain.AttendanceRecord, error) {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	query := "SELECT id, employee_id, action, timestamp FROM attendance_records WHERE timestamp >= $1 ORDER BY timestamp ASC"
	rows, err := r.db.Query(query, startOfDay)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var rec domain.AttendanceRecord
		if err := rows.Scan(&rec.ID, &rec.EmployeeID, &rec.Action, &rec.Timestamp); err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, nil
}

func (r *attendanceRepository) GetRecordsByDate(date time.Time) ([]domain.AttendanceRecord, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	query := "SELECT id, employee_id, action, timestamp FROM attendance_records WHERE timestamp >= $1 AND timestamp < $2 ORDER BY timestamp ASC"
	rows, err := r.db.Query(query, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var rec domain.AttendanceRecord
		if err := rows.Scan(&rec.ID, &rec.EmployeeID, &rec.Action, &rec.Timestamp); err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, nil
}

func (r *attendanceRepository) UpdateTodayArrival(employeeID uuid.UUID, newTime time.Time) error {
	query := `
		UPDATE attendance_records
		SET timestamp = $1
		WHERE id = (
			SELECT id FROM attendance_records
			WHERE employee_id = $2 AND action = 'ENTRADA'
			ORDER BY timestamp DESC
			LIMIT 1
		)
	`
	_, err := r.db.Exec(query, newTime, employeeID)
	return err
}

func (r *attendanceRepository) GetRecordsByDateRange(start, end time.Time) ([]domain.AttendanceRecord, error) {
	query := "SELECT id, employee_id, action, timestamp FROM attendance_records WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp ASC"
	rows, err := r.db.Query(query, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var rec domain.AttendanceRecord
		if err := rows.Scan(&rec.ID, &rec.EmployeeID, &rec.Action, &rec.Timestamp); err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, nil
}
