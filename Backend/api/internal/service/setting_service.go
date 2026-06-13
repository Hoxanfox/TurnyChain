package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
)

type SettingService interface {
	GetSetting(key string) (*domain.Setting, error)
	GetAllSettings() ([]domain.Setting, error)
	UpsertSetting(key string, value string) error
	UploadSettingImage(key string, file *multipart.FileHeader) (string, error)
}

type settingService struct {
	repo repository.SettingRepository
}

func NewSettingService(repo repository.SettingRepository) SettingService {
	return &settingService{repo: repo}
}

func (s *settingService) GetSetting(key string) (*domain.Setting, error) {
	return s.repo.GetSetting(key)
}

func (s *settingService) GetAllSettings() ([]domain.Setting, error) {
	return s.repo.GetAllSettings()
}

func (s *settingService) UpsertSetting(key string, value string) error {
	return s.repo.UpsertSetting(key, value)
}

func (s *settingService) UploadSettingImage(key string, file *multipart.FileHeader) (string, error) {
	// Solo permitimos ciertos keys para imágenes
	if key != "qr_code" && key != "logo" {
		return "", fmt.Errorf("invalid setting key for image upload")
	}

	uploadDir := "./uploads/settings"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return "", err
	}

	ext := filepath.Ext(file.Filename)
	// Sobrescribimos siempre con el mismo nombre para ahorrar espacio, o añadimos un hash.
	// Para limpiar caché del navegador en el frontend, retornaremos una URL con un query string ?v=time
	// Guardaremos el archivo con el nombre del key.
	fileName := fmt.Sprintf("%s%s", key, ext)
	filePath := filepath.Join(uploadDir, fileName)

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	// Format URL to be saved in DB
	fileUrl := fmt.Sprintf("/api/static/settings/%s", fileName)
	
	err = s.UpsertSetting(key, fileUrl)
	if err != nil {
		return "", err
	}

	return fileUrl, nil
}
