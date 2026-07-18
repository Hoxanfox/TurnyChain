package service

import (
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type AttendanceService interface {
	RegisterAttendance(employeeID uuid.UUID, action string, customTime *time.Time) (*domain.AttendanceRecord, error)
	GetTodayAttendanceStatus() ([]domain.EmployeeAttendance, error)
	GetAttendanceStatusByDate(date time.Time) ([]domain.EmployeeAttendance, error)
	GetAttendanceReport(start, end time.Time) ([]domain.AttendanceReport, error)
	UpdateTodayArrival(employeeID uuid.UUID, customTime time.Time) error
}

type attendanceService struct {
	attendanceRepo repository.AttendanceRepository
	employeeRepo   repository.EmployeeRepository
}

func NewAttendanceService(attRepo repository.AttendanceRepository, empRepo repository.EmployeeRepository) AttendanceService {
	return &attendanceService{
		attendanceRepo: attRepo,
		employeeRepo:   empRepo,
	}
}

func (s *attendanceService) RegisterAttendance(employeeID uuid.UUID, action string, customTime *time.Time) (*domain.AttendanceRecord, error) {
	// Verify employee exists
	_, err := s.employeeRepo.GetEmployeeByID(employeeID)
	if err != nil {
		return nil, err
	}

	record := &domain.AttendanceRecord{
		EmployeeID: employeeID,
		Action:     action,
	}
	if customTime != nil && !customTime.IsZero() {
		record.Timestamp = *customTime
	}
	return s.attendanceRepo.CreateRecord(record)
}

func (s *attendanceService) GetTodayAttendanceStatus() ([]domain.EmployeeAttendance, error) {
	return s.GetAttendanceStatusByDate(time.Now())
}

func (s *attendanceService) GetAttendanceStatusByDate(date time.Time) ([]domain.EmployeeAttendance, error) {
	employees, err := s.employeeRepo.GetEmployees()
	if err != nil {
		return nil, err
	}

	todayRecords, err := s.attendanceRepo.GetRecordsByDate(date)
	if err != nil {
		return nil, err
	}

	// Map latest status and first ENTRADA time per employee
	latestStatusMap := make(map[uuid.UUID]string)
	firstEntradaMap := make(map[uuid.UUID]string)

	for _, rec := range todayRecords {
		latestStatusMap[rec.EmployeeID] = rec.Action
		if rec.Action == "ENTRADA" {
			if _, exists := firstEntradaMap[rec.EmployeeID]; !exists {
				firstEntradaMap[rec.EmployeeID] = rec.Timestamp.Format(time.RFC3339)
			}
		} else if rec.Action == "SALIDA" || rec.Action == "RESET" || rec.Action == "FALTA" {
			delete(firstEntradaMap, rec.EmployeeID)
		}
	}

	result := make([]domain.EmployeeAttendance, 0)
	for _, emp := range employees {
		status := "SALIDA" // Default status if no records today or ever
		if val, ok := latestStatusMap[emp.ID]; ok {
			if val == "RESET" {
				status = "SALIDA"
			} else {
				status = val
			}
		}

		var arrTime *string
		if t, ok := firstEntradaMap[emp.ID]; ok && status == "ENTRADA" {
			arr := t
			arrTime = &arr
		}

		result = append(result, domain.EmployeeAttendance{
			Employee:     emp,
			CurrentState: status,
			ArrivalTime:  arrTime,
		})
	}

	return result, nil
}

func (s *attendanceService) UpdateTodayArrival(employeeID uuid.UUID, customTime time.Time) error {
	return s.attendanceRepo.UpdateTodayArrival(employeeID, customTime)
}

func (s *attendanceService) GetAttendanceReport(start, end time.Time) ([]domain.AttendanceReport, error) {
	employees, err := s.employeeRepo.GetEmployees()
	if err != nil {
		return nil, err
	}

	records, err := s.attendanceRepo.GetRecordsByDateRange(start, end)
	if err != nil {
		return nil, err
	}

	type dailyTracking struct {
		Arrival   *string
		Departure *string
	}
	tracking := make(map[uuid.UUID]map[string]*dailyTracking)

	for _, emp := range employees {
		tracking[emp.ID] = make(map[string]*dailyTracking)
	}

	for _, rec := range records {
		dateStr := rec.Timestamp.Format("2006-01-02")
		empTrack, ok := tracking[rec.EmployeeID]
		if !ok {
			continue
		}

		dayTrack, ok := empTrack[dateStr]
		if !ok {
			dayTrack = &dailyTracking{}
			empTrack[dateStr] = dayTrack
		}

		if rec.Action == "ENTRADA" {
			if dayTrack.Arrival == nil {
				t := rec.Timestamp.Format(time.RFC3339)
				dayTrack.Arrival = &t
			}
		} else if rec.Action == "SALIDA" {
			t := rec.Timestamp.Format(time.RFC3339)
			dayTrack.Departure = &t
		}
	}

	report := make([]domain.AttendanceReport, 0, len(employees))
	for _, emp := range employees {
		empTrack := tracking[emp.ID]
		dailyRecords := make([]domain.DailyAttendance, 0, len(empTrack))
		
		for dateStr, dt := range empTrack {
			if dt.Arrival != nil {
				dailyRecords = append(dailyRecords, domain.DailyAttendance{
					Date:          dateStr,
					ArrivalTime:   dt.Arrival,
					DepartureTime: dt.Departure,
				})
			}
		}

		report = append(report, domain.AttendanceReport{
			EmployeeID: emp.ID,
			Name:       emp.Name,
			Role:       emp.Role,
			DaysWorked: len(dailyRecords),
			Records:    dailyRecords,
		})
	}

	return report, nil
}
