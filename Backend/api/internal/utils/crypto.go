package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
	"os"
)

// GetEncryptionKey obtiene la clave de entorno o usa una de fallback para dev
func GetEncryptionKey() []byte {
	key := os.Getenv("INVOICE_ENCRYPTION_KEY")
	if len(key) != 32 {
		// Clave de respaldo solo para desarrollo local
		return []byte("12345678901234567890123456789012")
	}
	return []byte(key)
}

// Encrypt encripta texto usando AES-GCM y devuelve Base64
func Encrypt(text string) (string, error) {
	key := GetEncryptionKey()
	c, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(c)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(text), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}
