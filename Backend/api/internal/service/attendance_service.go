package service

import (
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type AttendanceService interface {
	RegisterAttendance(employeeID uuid.UUID, action string, customTime *time.Time) (*domain.AttendanceRecord, error)
	SetAttendanceStatus(employeeID uuid.UUID, action string, customTime time.Time) (*domain.AttendanceRecord, error)
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

func (s *attendanceService) SetAttendanceStatus(employeeID uuid.UUID, action string, customTime time.Time) (*domain.AttendanceRecord, error) {
	if _, err := s.employeeRepo.GetEmployeeByID(employeeID); err != nil {
		return nil, err
	}

	return s.attendanceRepo.ReplaceRecordByDate(&domain.AttendanceRecord{
		EmployeeID: employeeID,
		Action:     action,
		Timestamp:  customTime,
	})
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
		} else if rec.Action == "SALIDA" || rec.Action == "RESET" || rec.Action == "FALTA" || rec.Action == "DESCANSO" || rec.Action == "INICIO_DESCANSO" {
			delete(firstEntradaMap, rec.EmployeeID)
		}
	}

	result := make([]domain.EmployeeAttendance, 0)
	for _, emp := range employees {
		status := "SALIDA" // Default status if no records today or ever
		if val, ok := latestStatusMap[emp.ID]; ok {
			if val == "RESET" {
				status = "SALIDA"
			} else if val == "INICIO_DESCANSO" {
				status = "DESCANSO"
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
		LatestAction string
		Arrival      *string
		Departure    *string
	}
	tracking := make(map[uuid.UUID]map[string]*dailyTracking)

	for _, emp := range employees {
		tracking[emp.ID] = make(map[string]*dailyTracking)
	}

	for _, rec := range records {
		localTimestamp := rec.Timestamp.In(time.Local)
		dateStr := localTimestamp.Format("2006-01-02")
		empTrack, ok := tracking[rec.EmployeeID]
		if !ok {
			continue
		}

		dayTrack, ok := empTrack[dateStr]
		if !ok {
			dayTrack = &dailyTracking{}
			empTrack[dateStr] = dayTrack
		}

		dayTrack.LatestAction = rec.Action

		if rec.Action == "ENTRADA" {
			if dayTrack.Arrival == nil {
				t := localTimestamp.Format(time.RFC3339)
				dayTrack.Arrival = &t
			}
		} else if rec.Action == "SALIDA" {
			t := localTimestamp.Format(time.RFC3339)
			dayTrack.Departure = &t
		} else if rec.Action == "RESET" || rec.Action == "FALTA" {
			dayTrack.Arrival = nil
			dayTrack.Departure = nil
		}
	}

	report := make([]domain.AttendanceReport, 0, len(employees))
	for _, emp := range employees {
		empTrack := tracking[emp.ID]
		dailyRecords := make([]domain.DailyAttendance, 0)
		for date := start; !date.After(end); date = date.AddDate(0, 0, 1) {
			dateStr := date.Format("2006-01-02")
			dt, ok := empTrack[dateStr]
			status := "SIN_MARCAR"
			var arrivalTime, departureTime *string
			if ok {
				status = dt.LatestAction
				if status == "RESET" || status == "SALIDA" {
					status = "SIN_MARCAR"
				}
				if status != "ENTRADA" && status != "DESCANSO" && status != "INICIO_DESCANSO" && status != "FALTA" {
					status = "SIN_MARCAR"
				}
				arrivalTime = dt.Arrival
				departureTime = dt.Departure
			}
			if status == "INICIO_DESCANSO" {
				status = "DESCANSO"
			}
			dailyRecords = append(dailyRecords, domain.DailyAttendance{
				Date:          dateStr,
				Status:        status,
				ArrivalTime:   arrivalTime,
				DepartureTime: departureTime,
			})
		}

		daysWorked := 0
		daysRest := 0
		daysAbsent := 0
		daysUnmarked := 0
		days31Excluded := 0
		for _, dailyRecord := range dailyRecords {
			if dailyRecord.Date[len(dailyRecord.Date)-2:] == "31" {
				days31Excluded++
			}
			switch dailyRecord.Status {
			case "ENTRADA":
				daysWorked++
			case "DESCANSO":
				daysRest++
			case "FALTA":
				daysAbsent++
			case "SIN_MARCAR":
				daysUnmarked++
			}
		}

		report = append(report, domain.AttendanceReport{
			EmployeeID:      emp.ID,
			Name:            emp.Name,
			Role:            emp.Role,
			DaysWorked:      daysWorked,
			DaysRest:        daysRest,
			DaysAbsent:      daysAbsent,
			DaysUnmarked:    daysUnmarked,
			Days31Excluded:  days31Excluded,
			LiquidationDays: daysWorked + daysRest - days31Excluded,
			Records:         dailyRecords,
		})
	}

	return report, nil
}
