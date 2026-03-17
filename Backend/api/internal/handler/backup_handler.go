package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
)

type BackupHandler struct {
	backupService service.BackupService
}

func NewBackupHandler(s service.BackupService) *BackupHandler {
	return &BackupHandler{backupService: s}
}

func (h *BackupHandler) ExportCatalogBackup(c *fiber.Ctx) error {
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole != "admin" {
		log.Printf("[backup] export forbidden path=%s role=%v", c.Path(), c.Locals("user_role"))
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only admin can export backups"})
	}

	log.Printf("[backup] export requested path=%s by role=%s", c.Path(), userRole)

	backup, err := h.backupService.ExportCatalogBackup()
	if err != nil {
		log.Printf("[backup] export failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not generate backup"})
	}

	filename := fmt.Sprintf("catalog_backup_%s.json", time.Now().Format("20060102_150405"))
	c.Set(fiber.HeaderContentType, "application/json; charset=utf-8")
	c.Set(fiber.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%s", filename))

	return c.JSON(backup)
}

func (h *BackupHandler) ImportCatalogBackup(c *fiber.Ctx) error {
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole != "admin" {
		log.Printf("[backup] import forbidden path=%s role=%v", c.Path(), c.Locals("user_role"))
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only admin can import backups"})
	}

	log.Printf("[backup] import requested path=%s by role=%s", c.Path(), userRole)

	var backup domain.CatalogBackup

	file, err := c.FormFile("file")
	if err == nil && file != nil {
		log.Printf("[backup] import received multipart file name=%s size=%d", file.Filename, file.Size)
		openedFile, openErr := file.Open()
		if openErr != nil {
			log.Printf("[backup] import failed opening file: %v", openErr)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Could not read uploaded backup file"})
		}
		defer openedFile.Close()

		body, readErr := io.ReadAll(openedFile)
		if readErr != nil {
			log.Printf("[backup] import failed reading file: %v", readErr)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Could not parse uploaded backup file"})
		}

		if unmarshalErr := json.Unmarshal(body, &backup); unmarshalErr != nil {
			log.Printf("[backup] import invalid JSON file: %v", unmarshalErr)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Backup file must be valid JSON"})
		}
	} else {
		if parseErr := c.BodyParser(&backup); parseErr != nil {
			log.Printf("[backup] import invalid body JSON: %v", parseErr)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Request body must contain a valid backup payload"})
		}
	}

	result, importErr := h.backupService.ImportCatalogBackup(&backup)
	if importErr != nil {
		log.Printf("[backup] import failed in service: %v", importErr)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": importErr.Error()})
	}

	log.Printf("[backup] import success tables=%d stations=%d printers=%d categories=%d ingredients=%d accompaniments=%d menu=%d", result.TablesImported, result.StationsImported, result.PrintersImported, result.CategoriesImported, result.IngredientsImported, result.AccompanimentsImported, result.MenuItemsImported)

	return c.JSON(fiber.Map{
		"message": "Catalog backup imported successfully",
		"result":  result,
	})
}
