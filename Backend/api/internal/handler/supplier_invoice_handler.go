package handler

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SupplierInvoiceHandler struct { service service.SupplierInvoiceService }

func NewSupplierInvoiceHandler(invoiceService service.SupplierInvoiceService) *SupplierInvoiceHandler { return &SupplierInvoiceHandler{service: invoiceService} }

func (h *SupplierInvoiceHandler) GetAll(c *fiber.Ctx) error {
	invoices, err := h.service.GetInvoices()
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()}) }
	return c.JSON(invoices)
}

func (h *SupplierInvoiceHandler) GetOne(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id")); if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id inválido"}) }
	invoice, err := h.service.GetInvoice(id)
	if err != nil { return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "factura no encontrada"}) }
	return c.JSON(invoice)
}

func (h *SupplierInvoiceHandler) Create(c *fiber.Ctx) error {
	userID, err := getUserIDFromLocals(c); if err != nil { return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión inválida"}) }
	input, attachmentPath, err := parseInvoiceForm(c)
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	input.AttachmentPath = attachmentPath
	invoice, err := h.service.CreateInvoice(userID, input)
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.Status(fiber.StatusCreated).JSON(invoice)
}

func (h *SupplierInvoiceHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id")); if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id inválido"}) }
	input, attachmentPath, err := parseInvoiceForm(c)
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	input.AttachmentPath = attachmentPath
	invoice, err := h.service.UpdateInvoice(id, input)
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.JSON(invoice)
}

func (h *SupplierInvoiceHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id")); if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id inválido"}) }
	if err := h.service.DeleteInvoice(id); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *SupplierInvoiceHandler) AddPayment(c *fiber.Ctx) error {
	userID, err := getUserIDFromLocals(c); if err != nil { return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión inválida"}) }
	id, err := uuid.Parse(c.Params("id")); if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id inválido"}) }
	var input service.SupplierInvoicePaymentInput
	if err := c.BodyParser(&input); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cuerpo inválido"}) }
	invoice, err := h.service.AddPayment(userID, id, input)
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.Status(fiber.StatusCreated).JSON(invoice)
}

func parseInvoiceForm(c *fiber.Ctx) (service.SupplierInvoiceInput, *string, error) {
	var input service.SupplierInvoiceInput
	data := strings.TrimSpace(c.FormValue("invoice_data"))
	if data == "" { data = strings.TrimSpace(string(c.Body())) }
	if data == "" { return input, nil, fmt.Errorf("invoice_data es obligatorio") }
	if err := json.Unmarshal([]byte(data), &input); err != nil { return input, nil, fmt.Errorf("invoice_data inválido") }
	file, err := c.FormFile("attachment")
	if err != nil { return input, nil, nil }
	if err := os.MkdirAll("./uploads/supplier-invoices", os.ModePerm); err != nil { return input, nil, err }
	filename := fmt.Sprintf("invoice_%s_%d%s", uuid.New().String(), time.Now().UnixNano(), filepath.Ext(file.Filename))
	path := filepath.Join("uploads", "supplier-invoices", filename)
	if err := c.SaveFile(file, path); err != nil { return input, nil, err }
	publicPath := "/static/supplier-invoices/" + filename
	return input, &publicPath, nil
}