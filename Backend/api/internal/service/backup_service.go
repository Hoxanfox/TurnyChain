package service

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type BackupService interface {
	ExportCatalogBackup() (*domain.CatalogBackup, error)
	ImportCatalogBackup(backup *domain.CatalogBackup) (*domain.CatalogRestoreResult, error)
}

type backupService struct {
	db *sql.DB
}

func NewBackupService(db *sql.DB) BackupService {
	return &backupService{db: db}
}

func (s *backupService) ExportCatalogBackup() (*domain.CatalogBackup, error) {
	users, err := s.getUsers()
	if err != nil {
		return nil, err
	}

	tables, err := s.getTables()
	if err != nil {
		return nil, err
	}

	stations, err := s.getStations()
	if err != nil {
		return nil, err
	}

	printers, err := s.getPrinters()
	if err != nil {
		return nil, err
	}

	categories, err := s.getCategories()
	if err != nil {
		return nil, err
	}

	ingredients, err := s.getIngredients()
	if err != nil {
		return nil, err
	}

	accompaniments, err := s.getAccompaniments()
	if err != nil {
		return nil, err
	}

	menuItems, err := s.getMenuItems()
	if err != nil {
		return nil, err
	}

	ingByMenu, err := s.getIngredientIDsByMenuItem()
	if err != nil {
		return nil, err
	}

	accByMenu, err := s.getAccompanimentIDsByMenuItem()
	if err != nil {
		return nil, err
	}

	for i := range menuItems {
		menuID := menuItems[i].ID
		menuItems[i].IngredientIDs = ingByMenu[menuID]
		menuItems[i].AccompanimentIDs = accByMenu[menuID]
	}

	backup := &domain.CatalogBackup{
		Version:        "catalog-backup-v1",
		GeneratedAt:    time.Now().UTC(),
		Users:          users,
		Tables:         tables,
		Stations:       stations,
		Printers:       printers,
		Categories:     categories,
		Ingredients:    ingredients,
		Accompaniments: accompaniments,
		MenuItems:      menuItems,
	}

	return backup, nil
}

func (s *backupService) ImportCatalogBackup(backup *domain.CatalogBackup) (*domain.CatalogRestoreResult, error) {
	if backup == nil {
		return nil, errors.New("backup payload is required")
	}

	if strings.TrimSpace(backup.Version) == "" {
		return nil, errors.New("backup version is required")
	}

	if !strings.HasPrefix(backup.Version, "catalog-backup-v") {
		return nil, fmt.Errorf("unsupported backup version: %s", backup.Version)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}

	rollback := func(cause error) (*domain.CatalogRestoreResult, error) {
		_ = tx.Rollback()
		return nil, cause
	}

	cleanupStatements := []string{
		`DELETE FROM order_items`,
		`DELETE FROM orders`,
		`DELETE FROM menu_item_ingredients`,
		`DELETE FROM menu_item_accompaniments`,
		`DELETE FROM menu_items`,
		`DELETE FROM categories`,
		`DELETE FROM printers`,
		`DELETE FROM stations`,
		`DELETE FROM ingredients`,
		`DELETE FROM accompaniments`,
		`DELETE FROM tables`,
	}

	for _, stmt := range cleanupStatements {
		if _, err := tx.Exec(stmt); err != nil {
			return rollback(err)
		}
	}

	result := &domain.CatalogRestoreResult{
		UsersSkipped: len(backup.Users),
		Warning:      "Users were skipped during restore because password hashes are not included in exported backups.",
	}

	for _, t := range backup.Tables {
		if _, err := tx.Exec(
			`INSERT INTO tables (id, table_number, is_active) VALUES ($1, $2, $3)`,
			t.ID,
			t.TableNumber,
			t.IsActive,
		); err != nil {
			return rollback(err)
		}
		result.TablesImported++
	}

	now := time.Now().UTC()
	for _, st := range backup.Stations {
		createdAt := st.CreatedAt
		if createdAt.IsZero() {
			createdAt = now
		}

		if _, err := tx.Exec(
			`INSERT INTO stations (id, name, description, is_active, created_at) VALUES ($1, $2, $3, $4, $5)`,
			st.ID,
			st.Name,
			st.Description,
			st.IsActive,
			createdAt,
		); err != nil {
			return rollback(err)
		}
		result.StationsImported++
	}

	for _, p := range backup.Printers {
		createdAt := p.CreatedAt
		if createdAt.IsZero() {
			createdAt = now
		}

		if _, err := tx.Exec(
			`INSERT INTO printers (id, name, ip_address, port, printer_type, station_id, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			p.ID,
			p.Name,
			p.IPAddress,
			p.Port,
			p.PrinterType,
			p.StationID,
			p.IsActive,
			createdAt,
		); err != nil {
			return rollback(err)
		}
		result.PrintersImported++
	}

	for _, c := range backup.Categories {
		if _, err := tx.Exec(
			`INSERT INTO categories (id, name, station_id) VALUES ($1, $2, $3)`,
			c.ID,
			c.Name,
			c.StationID,
		); err != nil {
			return rollback(err)
		}
		result.CategoriesImported++
	}

	for _, ing := range backup.Ingredients {
		if _, err := tx.Exec(
			`INSERT INTO ingredients (id, name) VALUES ($1, $2)`,
			ing.ID,
			ing.Name,
		); err != nil {
			return rollback(err)
		}
		result.IngredientsImported++
	}

	for _, acc := range backup.Accompaniments {
		if _, err := tx.Exec(
			`INSERT INTO accompaniments (id, name, price) VALUES ($1, $2, $3)`,
			acc.ID,
			acc.Name,
			acc.Price,
		); err != nil {
			return rollback(err)
		}
		result.AccompanimentsImported++
	}

	for _, item := range backup.MenuItems {
		if _, err := tx.Exec(
			`INSERT INTO menu_items (id, name, description, price, category_id, is_available, order_count) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			item.ID,
			item.Name,
			item.Description,
			item.Price,
			item.CategoryID,
			item.IsAvailable,
			item.OrderCount,
		); err != nil {
			return rollback(err)
		}
		result.MenuItemsImported++

		for _, ingID := range item.IngredientIDs {
			if _, err := tx.Exec(
				`INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES ($1, $2)`,
				item.ID,
				ingID,
			); err != nil {
				return rollback(err)
			}
			result.MenuIngredientLinksImported++
		}

		for _, accID := range item.AccompanimentIDs {
			if _, err := tx.Exec(
				`INSERT INTO menu_item_accompaniments (menu_item_id, accompaniment_id) VALUES ($1, $2)`,
				item.ID,
				accID,
			); err != nil {
				return rollback(err)
			}
			result.MenuAccompanimentLinksCount++
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *backupService) getUsers() ([]domain.BackupUser, error) {
	rows, err := s.db.Query(`SELECT id, username, role, is_active FROM users ORDER BY username`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]domain.BackupUser, 0)
	for rows.Next() {
		var u domain.BackupUser
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.IsActive); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, nil
}

func (s *backupService) getTables() ([]domain.Table, error) {
	rows, err := s.db.Query(`SELECT id, table_number, is_active FROM tables ORDER BY table_number`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tables := make([]domain.Table, 0)
	for rows.Next() {
		var t domain.Table
		if err := rows.Scan(&t.ID, &t.TableNumber, &t.IsActive); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}

	return tables, nil
}

func (s *backupService) getStations() ([]domain.Station, error) {
	rows, err := s.db.Query(`SELECT id, name, description, is_active, created_at FROM stations ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stations := make([]domain.Station, 0)
	for rows.Next() {
		var st domain.Station
		var description sql.NullString
		if err := rows.Scan(&st.ID, &st.Name, &description, &st.IsActive, &st.CreatedAt); err != nil {
			return nil, err
		}
		if description.Valid {
			st.Description = description.String
		}
		stations = append(stations, st)
	}

	return stations, nil
}

func (s *backupService) getPrinters() ([]domain.Printer, error) {
	rows, err := s.db.Query(`
		SELECT id, name, ip_address, port, printer_type, station_id, is_active, created_at
		FROM printers
		ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	printers := make([]domain.Printer, 0)
	for rows.Next() {
		var p domain.Printer
		if err := rows.Scan(&p.ID, &p.Name, &p.IPAddress, &p.Port, &p.PrinterType, &p.StationID, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		printers = append(printers, p)
	}

	return printers, nil
}

func (s *backupService) getCategories() ([]domain.Category, error) {
	rows, err := s.db.Query(`SELECT id, name, station_id FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := make([]domain.Category, 0)
	for rows.Next() {
		var c domain.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.StationID); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, nil
}

func (s *backupService) getIngredients() ([]domain.Ingredient, error) {
	rows, err := s.db.Query(`SELECT id, name FROM ingredients ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ingredients := make([]domain.Ingredient, 0)
	for rows.Next() {
		var ing domain.Ingredient
		if err := rows.Scan(&ing.ID, &ing.Name); err != nil {
			return nil, err
		}
		ingredients = append(ingredients, ing)
	}

	return ingredients, nil
}

func (s *backupService) getAccompaniments() ([]domain.Accompaniment, error) {
	rows, err := s.db.Query(`SELECT id, name, price FROM accompaniments ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accompaniments := make([]domain.Accompaniment, 0)
	for rows.Next() {
		var acc domain.Accompaniment
		if err := rows.Scan(&acc.ID, &acc.Name, &acc.Price); err != nil {
			return nil, err
		}
		accompaniments = append(accompaniments, acc)
	}

	return accompaniments, nil
}

func (s *backupService) getMenuItems() ([]domain.BackupMenuItem, error) {
	rows, err := s.db.Query(`
		SELECT id, name, description, price, category_id, is_available, order_count
		FROM menu_items
		ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.BackupMenuItem, 0)
	for rows.Next() {
		var item domain.BackupMenuItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Price, &item.CategoryID, &item.IsAvailable, &item.OrderCount); err != nil {
			return nil, err
		}
		item.IngredientIDs = make([]uuid.UUID, 0)
		item.AccompanimentIDs = make([]uuid.UUID, 0)
		items = append(items, item)
	}

	return items, nil
}

func (s *backupService) getIngredientIDsByMenuItem() (map[uuid.UUID][]uuid.UUID, error) {
	rows, err := s.db.Query(`SELECT menu_item_id, ingredient_id FROM menu_item_ingredients`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rel := make(map[uuid.UUID][]uuid.UUID)
	for rows.Next() {
		var menuItemID uuid.UUID
		var ingredientID uuid.UUID
		if err := rows.Scan(&menuItemID, &ingredientID); err != nil {
			return nil, err
		}
		rel[menuItemID] = append(rel[menuItemID], ingredientID)
	}

	for menuID := range rel {
		sort.Slice(rel[menuID], func(i, j int) bool {
			return rel[menuID][i].String() < rel[menuID][j].String()
		})
	}

	return rel, nil
}

func (s *backupService) getAccompanimentIDsByMenuItem() (map[uuid.UUID][]uuid.UUID, error) {
	rows, err := s.db.Query(`SELECT menu_item_id, accompaniment_id FROM menu_item_accompaniments`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rel := make(map[uuid.UUID][]uuid.UUID)
	for rows.Next() {
		var menuItemID uuid.UUID
		var accompanimentID uuid.UUID
		if err := rows.Scan(&menuItemID, &accompanimentID); err != nil {
			return nil, err
		}
		rel[menuItemID] = append(rel[menuItemID], accompanimentID)
	}

	for menuID := range rel {
		sort.Slice(rel[menuID], func(i, j int) bool {
			return rel[menuID][i].String() < rel[menuID][j].String()
		})
	}

	return rel, nil
}
