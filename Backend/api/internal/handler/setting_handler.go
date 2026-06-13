package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
)

type SettingHandler struct {
	Service service.SettingService
}

func NewSettingHandler(s service.SettingService) *SettingHandler {
	return &SettingHandler{Service: s}
}

func (h *SettingHandler) GetAllSettings(c *fiber.Ctx) error {
	settings, err := h.Service.GetAllSettings()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(settings)
}

func (h *SettingHandler) GetSetting(c *fiber.Ctx) error {
	key := c.Params("key")
	setting, err := h.Service.GetSetting(key)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if setting == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Setting not found"})
	}
	return c.JSON(setting)
}

func (h *SettingHandler) UpsertSetting(c *fiber.Ctx) error {
	var payload struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	err := h.Service.UpsertSetting(payload.Key, payload.Value)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Setting updated successfully"})
}

func (h *SettingHandler) UploadSettingImage(c *fiber.Ctx) error {
	key := c.FormValue("key")
	if key == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Setting key is required"})
	}

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Image file is required"})
	}

	url, err := h.Service.UploadSettingImage(key, file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Image uploaded successfully",
		"url":     url,
	})
}
