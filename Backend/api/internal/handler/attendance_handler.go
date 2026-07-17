package handler

import (

	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AttendanceHandler struct {
	service service.AttendanceService
	hub     *websocket.Hub
}

func NewAttendanceHandler(s service.AttendanceService, hub *websocket.Hub) *AttendanceHandler {
	return &AttendanceHandler{service: s, hub: hub}
}

func (h *AttendanceHandler) broadcastAttendanceUpdate() {
	if h.hub == nil {
		return
	}
	h.hub.BroadcastMessage("ATTENDANCE_UPDATED", nil)
}

func (h *AttendanceHandler) RegisterAttendance(c *fiber.Ctx) error {
	var payload struct {
		EmployeeID uuid.UUID `json:"employee_id"`
		Action     string    `json:"action"`
		Timestamp  *string   `json:"timestamp"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if payload.EmployeeID == uuid.Nil || payload.Action == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "employee_id and action are required"})
	}

	var customTime *time.Time
	if payload.Timestamp != nil && *payload.Timestamp != "" {
		t, err := time.Parse(time.RFC3339, *payload.Timestamp)
		if err == nil {
			customTime = &t
		}
	}

	record, err := h.service.RegisterAttendance(payload.EmployeeID, payload.Action, customTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to register attendance"})
	}

	go h.broadcastAttendanceUpdate()

	return c.Status(fiber.StatusCreated).JSON(record)
}

func (h *AttendanceHandler) GetTodayAttendanceStatus(c *fiber.Ctx) error {
	status, err := h.service.GetTodayAttendanceStatus()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get attendance status"})
	}

	return c.JSON(status)
}

func (h *AttendanceHandler) UpdateTodayArrival(c *fiber.Ctx) error {
	var payload struct {
		EmployeeID uuid.UUID `json:"employee_id"`
		Timestamp  string    `json:"timestamp"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	t, err := time.Parse(time.RFC3339, payload.Timestamp)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid timestamp format"})
	}

	if err := h.service.UpdateTodayArrival(payload.EmployeeID, t); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update arrival time"})
	}

	go h.broadcastAttendanceUpdate()

	return c.JSON(fiber.Map{"message": "Arrival time updated successfully"})
}

func (h *AttendanceHandler) GetAttendanceReport(c *fiber.Ctx) error {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "start_date and end_date are required"})
	}

	start, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start_date format, expected YYYY-MM-DD"})
	}

	end, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end_date format, expected YYYY-MM-DD"})
	}
	
	end = end.Add(24 * time.Hour).Add(-time.Second)

	report, err := h.service.GetAttendanceReport(start, end)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate report"})
	}

	return c.JSON(report)
}
