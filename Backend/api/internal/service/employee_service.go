package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type EmployeeService interface {
	CreateEmployee(employee *domain.Employee) (*domain.Employee, error)
	GetEmployees() ([]domain.Employee, error)
	GetEmployeeByID(id uuid.UUID) (*domain.Employee, error)
	UpdateEmployee(id uuid.UUID, employee *domain.Employee) (*domain.Employee, error)
	DeleteEmployee(id uuid.UUID) error
}

type employeeService struct {
	repo repository.EmployeeRepository
}

func NewEmployeeService(repo repository.EmployeeRepository) EmployeeService {
	return &employeeService{repo: repo}
}

func (s *employeeService) CreateEmployee(employee *domain.Employee) (*domain.Employee, error) {
	employee.IsActive = true
	return s.repo.CreateEmployee(employee)
}

func (s *employeeService) GetEmployees() ([]domain.Employee, error) {
	return s.repo.GetEmployees()
}

func (s *employeeService) GetEmployeeByID(id uuid.UUID) (*domain.Employee, error) {
	return s.repo.GetEmployeeByID(id)
}

func (s *employeeService) UpdateEmployee(id uuid.UUID, employee *domain.Employee) (*domain.Employee, error) {
	existing, err := s.repo.GetEmployeeByID(id)
	if err != nil {
		return nil, err
	}
	existing.Name = employee.Name
	existing.Role = employee.Role
	existing.IsActive = employee.IsActive
	return s.repo.UpdateEmployee(existing)
}

func (s *employeeService) DeleteEmployee(id uuid.UUID) error {
	return s.repo.DeleteEmployee(id)
}
