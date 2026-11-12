package middleware

import (
	"encoding/json"
	"strings"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/gofiber/fiber/v2"
)

func ModuleEnabled(settings repository.SettingRepository, module string) fiber.Handler {
	key := "module_" + strings.ToLower(strings.TrimSpace(module)) + "_enabled"

	return func(c *fiber.Ctx) error {
		setting, err := settings.GetSetting(key)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "No se pudo verificar el estado del módulo",
			})
		}
		if setting == nil || setting.Value == "" {
			return c.Next()
		}

		enabled, err := settingEnabled(setting.Value)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "La configuración del módulo no es válida",
			})
		}
		if !enabled {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":       "Módulo desactivado",
				"module":      module,
				"setting_key": key,
			})
		}
		return c.Next()
	}
}

func settingEnabled(value string) (bool, error) {
	trimmed := strings.TrimSpace(value)
	var jsonValue bool
	if err := json.Unmarshal([]byte(trimmed), &jsonValue); err == nil {
		return jsonValue, nil
	}
	var jsonString string
	if err := json.Unmarshal([]byte(trimmed), &jsonString); err == nil {
		trimmed = strings.TrimSpace(jsonString)
	}
	switch strings.ToLower(trimmed) {
	case "true", "1", "yes", "si", "sí", "on":
		return true, nil
	case "false", "0", "no", "off":
		return false, nil
	default:
		return false, fiber.NewError(fiber.StatusInternalServerError, "invalid module setting")
	}
}
