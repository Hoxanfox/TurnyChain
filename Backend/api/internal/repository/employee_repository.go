package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type EmployeeRepository interface {
	CreateEmployee(employee *domain.Employee) (*domain.Employee, error)
	GetEmployees() ([]domain.Employee, error)
	GetEmployeeByID(id uuid.UUID) (*domain.Employee, error)
	UpdateEmployee(employee *domain.Employee) (*domain.Employee, error)
	DeleteEmployee(id uuid.UUID) error
}

type employeeRepository struct {
	db *sql.DB
}

func NewEmployeeRepository(db *sql.DB) EmployeeRepository {
	return &employeeRepository{db: db}
}

func (r *employeeRepository) CreateEmployee(employee *domain.Employee) (*domain.Employee, error) {
	employee.ID = uuid.New()
	query := "INSERT INTO employees (id, name, role, is_active) VALUES ($1, $2, $3, $4) RETURNING id"
	err := r.db.QueryRow(query, employee.ID, employee.Name, employee.Role, employee.IsActive).Scan(&employee.ID)
	if err != nil {
		return nil, err
	}
	return employee, nil
}

func (r *employeeRepository) GetEmployees() ([]domain.Employee, error) {
	query := "SELECT id, name, role, is_active FROM employees WHERE is_active = true"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	employees := make([]domain.Employee, 0)
	for rows.Next() {
		var e domain.Employee
		if err := rows.Scan(&e.ID, &e.Name, &e.Role, &e.IsActive); err != nil {
			return nil, err
		}
		employees = append(employees, e)
	}
	return employees, nil
}

func (r *employeeRepository) GetEmployeeByID(id uuid.UUID) (*domain.Employee, error) {
	e := &domain.Employee{}
	query := "SELECT id, name, role, is_active FROM employees WHERE id = $1 AND is_active = true"
	err := r.db.QueryRow(query, id).Scan(&e.ID, &e.Name, &e.Role, &e.IsActive)
	return e, err
}

func (r *employeeRepository) UpdateEmployee(employee *domain.Employee) (*domain.Employee, error) {
	query := "UPDATE employees SET name = $1, role = $2, is_active = $3 WHERE id = $4 RETURNING id"
	err := r.db.QueryRow(query, employee.Name, employee.Role, employee.IsActive, employee.ID).Scan(&employee.ID)
	if err != nil {
		return nil, err
	}
	return employee, nil
}

func (r *employeeRepository) DeleteEmployee(id uuid.UUID) error {
	query := "UPDATE employees SET is_active = false WHERE id = $1"
	_, err := r.db.Exec(query, id)
	return err
}
