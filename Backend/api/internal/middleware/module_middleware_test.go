package middleware

import (
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/gofiber/fiber/v2"
)

type moduleSettingsStub struct {
	value string
	err   error
}

func (s *moduleSettingsStub) GetSetting(string) (*domain.Setting, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.value == "" {
		return nil, nil
	}
	return &domain.Setting{Value: s.value}, nil
}

func (*moduleSettingsStub) GetAllSettings() ([]domain.Setting, error) { return nil, nil }
func (*moduleSettingsStub) UpsertSetting(string, string) error         { return nil }

func TestModuleEnabledPreservesAccessWhenModuleIsReactivated(t *testing.T) {
	settings := &moduleSettingsStub{value: "false"}
	app := fiber.New()
	app.Get("/inventory", ModuleEnabled(settings, "inventory"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	response, err := app.Test(httptest.NewRequest("GET", "/inventory", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("disabled module status = %d, want %d", response.StatusCode, fiber.StatusForbidden)
	}

	settings.value = "true"
	response, err = app.Test(httptest.NewRequest("GET", "/inventory", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("reactivated module status = %d, want %d", response.StatusCode, fiber.StatusOK)
	}
}

func TestModuleEnabledAllowsMissingSettingForCompatibility(t *testing.T) {
	app := fiber.New()
	app.Get("/inventory", ModuleEnabled(&moduleSettingsStub{}, "inventory"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	response, err := app.Test(httptest.NewRequest("GET", "/inventory", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("missing setting status = %d, want %d", response.StatusCode, fiber.StatusOK)
	}
}

func TestModuleEnabledReturnsServerErrorForRepositoryFailure(t *testing.T) {
	app := fiber.New()
	app.Get("/inventory", ModuleEnabled(&moduleSettingsStub{err: errors.New("database unavailable")}, "inventory"))

	response, err := app.Test(httptest.NewRequest("GET", "/inventory", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("repository failure status = %d, want %d", response.StatusCode, fiber.StatusInternalServerError)
	}
}
