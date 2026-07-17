package domain

import (
	"time"

	"github.com/google/uuid"
)

type AttendanceRecord struct {
	ID         uuid.UUID `json:"id" db:"id"`
	EmployeeID uuid.UUID `json:"employee_id" db:"employee_id"`
	Action     string    `json:"action" db:"action"` // ENTRADA, SALIDA, INICIO_DESCANSO, FIN_DESCANSO
	Timestamp  time.Time `json:"timestamp" db:"timestamp"`
}

type EmployeeAttendance struct {
	Employee
	CurrentState string  `json:"current_state"` // ENTRADA, SALIDA
	ArrivalTime  *string `json:"arrival_time"`
}

type DailyAttendance struct {
	Date          string  `json:"date"`
	ArrivalTime   *string `json:"arrival_time"`
	DepartureTime *string `json:"departure_time"`
}

type AttendanceReport struct {
	EmployeeID  uuid.UUID         `json:"employee_id"`
	Name        string            `json:"name"`
	Role        string            `json:"role"`
	DaysWorked  int               `json:"days_worked"`
	Records     []DailyAttendance `json:"records"`
}
