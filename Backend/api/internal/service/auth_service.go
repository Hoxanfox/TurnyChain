// =================================================================
// ARCHIVO 4: /internal/service/auth_service.go (ACTUALIZADO CON LOGS)
// =================================================================
package service

import (
	"errors"
	"log"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// JWT_SECRET_KEY debería estar en una variable de entorno.
var JWT_SECRET_KEY = []byte("mi_clave_secreta_super_segura_cambiar_en_produccion")

type AuthService interface {
	Login(username, password, deviceID string) (string, error)
	VerifyPassword(userID uuid.UUID, password string) error
	Logout(tokenString string) error
}

type authService struct {
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
}

func NewAuthService(userRepo repository.UserRepository, sessionRepo repository.SessionRepository) AuthService {
	return &authService{userRepo: userRepo, sessionRepo: sessionRepo}
}

func (s *authService) VerifyPassword(userID uuid.UUID, password string) error {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return errors.New("invalid password")
	}

	return nil
}

func (s *authService) Logout(tokenString string) error {
	return nil
}

func (s *authService) Login(username, password, deviceID string) (string, error) {
	log.Printf("Iniciando intento de login para el usuario: %s", username)

	// 1. Obtener el usuario de la base de datos
	user, err := s.userRepo.GetUserByUsername(username)
	if err != nil {
		log.Printf("Error al buscar el usuario '%s': %v", username, err)
		return "", errors.New("credenciales inválidas")
	}

	log.Printf("Usuario '%s' encontrado en la base de datos. Verificando contraseña...", username)

	// 2. Comparar la contraseña hasheada con la proporcionada
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		log.Printf("Error en la comparación de contraseña para el usuario '%s': %v", username, err)
		return "", errors.New("credenciales inválidas")
	}

	log.Printf("Contraseña verificada exitosamente para el usuario '%s'. Generando token...", username)

	if err := s.sessionRepo.RevokeActiveSessions(user.ID, "new_login"); err != nil {
		log.Printf("Error revocando sesiones activas para '%s': %v", username, err)
		return "", errors.New("no se pudo iniciar sesion")
	}

	expiration := time.Now().Add(4 * time.Hour)
	var devicePtr *string
	if trimmed := strings.TrimSpace(deviceID); trimmed != "" {
		devicePtr = &trimmed
	}

	sessionID, err := s.sessionRepo.CreateSession(user.ID, devicePtr, expiration)
	if err != nil {
		log.Printf("Error creando sesion para '%s': %v", username, err)
		return "", errors.New("no se pudo iniciar sesion")
	}

	// 3. Crear los claims (la información dentro del token)
	claims := jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"sid":  sessionID.String(),
		"exp":  expiration.Unix(),
	}

	// 4. Crear y firmar el token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWT_SECRET_KEY)
}