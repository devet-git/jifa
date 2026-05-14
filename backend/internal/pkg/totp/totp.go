package totp

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// GenerateSecret returns a random base32-encoded 20-byte TOTP secret.
func GenerateSecret() (string, error) {
	raw := make([]byte, 20)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(raw), nil
}

// Validate checks whether code matches the current TOTP value for secret,
// accepting a ±1 window (30-second periods) to tolerate clock skew.
func Validate(secret, code string) bool {
	counter := time.Now().Unix() / 30
	for _, delta := range []int64{-1, 0, 1} {
		if generate(secret, counter+delta) == code {
			return true
		}
	}
	return false
}

// OTPAuthURL returns the otpauth:// URI for QR code generation.
func OTPAuthURL(issuer, accountName, secret string) string {
	label := url.PathEscape(issuer + ":" + accountName)
	q := url.Values{}
	q.Set("secret", secret)
	q.Set("issuer", issuer)
	q.Set("algorithm", "SHA1")
	q.Set("digits", "6")
	q.Set("period", "30")
	return "otpauth://totp/" + label + "?" + q.Encode()
}

func generate(secret string, counter int64) string {
	s := strings.ToUpper(strings.TrimRight(secret, "="))
	// Try without padding first, then with padding.
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(s)
	if err != nil {
		key, err = base32.StdEncoding.DecodeString(secret)
		if err != nil {
			return ""
		}
	}
	msg := make([]byte, 8)
	binary.BigEndian.PutUint64(msg, uint64(counter))
	mac := hmac.New(sha1.New, key)
	mac.Write(msg)
	h := mac.Sum(nil)
	offset := h[len(h)-1] & 0x0f
	code := binary.BigEndian.Uint32(h[offset:offset+4]) & 0x7fffffff
	return fmt.Sprintf("%06d", code%1_000_000)
}
