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
	CurrentState string  `json:"current_state"` // ENTRADA, DESCANSO, FALTA, SALIDA
	ArrivalTime  *string `json:"arrival_time"`
}

type DailyAttendance struct {
	Date          string  `json:"date"`
	Status        string  `json:"status"` // ENTRADA, DESCANSO, FALTA, SIN_MARCAR
	ArrivalTime   *string `json:"arrival_time"`
	DepartureTime *string `json:"departure_time"`
}

type AttendanceReport struct {
	EmployeeID      uuid.UUID         `json:"employee_id"`
	Name            string            `json:"name"`
	Role            string            `json:"role"`
	DaysWorked      int               `json:"days_worked"`
	DaysRest        int               `json:"days_rest"`
	DaysAbsent      int               `json:"days_absent"`
	DaysUnmarked    int               `json:"days_unmarked"`
	Days31Excluded  int               `json:"days_31_excluded"`
	LiquidationDays int               `json:"liquidation_days"`
	Records         []DailyAttendance `json:"records"`
}
