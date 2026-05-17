package gitlab

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"os"
)

// EncryptToken seals plaintext with AES-GCM using JIFA_INTEGRATION_KEY
// (64-hex-char). Fails closed if the env var is missing/malformed.
func EncryptToken(plaintext string) (cipherB64, nonceB64 string, err error) {
	key, err := loadKey()
	if err != nil {
		return "", "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", "", err
	}
	ct := gcm.Seal(nil, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ct), base64.StdEncoding.EncodeToString(nonce), nil
}

func DecryptToken(cipherB64, nonceB64 string) (string, error) {
	key, err := loadKey()
	if err != nil {
		return "", err
	}
	ct, err := base64.StdEncoding.DecodeString(cipherB64)
	if err != nil {
		return "", err
	}
	nonce, err := base64.StdEncoding.DecodeString(nonceB64)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	pt, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}

func IntegrationKeyConfigured() bool {
	_, err := loadKey()
	return err == nil
}

func loadKey() ([]byte, error) {
	raw := os.Getenv("JIFA_INTEGRATION_KEY")
	if raw == "" {
		return nil, errors.New("JIFA_INTEGRATION_KEY is not set")
	}
	key, err := hex.DecodeString(raw)
	if err != nil {
		return nil, errors.New("JIFA_INTEGRATION_KEY is not valid hex")
	}
	if len(key) != 32 {
		return nil, errors.New("JIFA_INTEGRATION_KEY must decode to 32 bytes")
	}
	return key, nil
}

// RandomSecret returns 32 random bytes as a hex string.
func RandomSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
