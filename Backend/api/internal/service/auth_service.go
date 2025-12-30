// =================================================================
// ARCHIVO 4: /internal/service/auth_service.go (ACTUALIZADO CON LOGS)
// =================================================================
package service

import (
	"errors"
	"log"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// JWT_SECRET_KEY debería estar en una variable de entorno.
var JWT_SECRET_KEY = []byte("mi_clave_secreta_super_segura_cambiar_en_produccion")

type AuthService interface {
	Login(username, password string) (string, error)
}

type authService struct {
	userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authService{userRepo: userRepo}
}

func (s *authService) Login(username, password string) (string, error) {
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

	// 3. Crear los claims (la información dentro del token)
	claims := jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	}

	// 4. Crear y firmar el token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWT_SECRET_KEY)
}