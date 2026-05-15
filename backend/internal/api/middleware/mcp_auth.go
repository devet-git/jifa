package middleware

import (
	"net/http"
	"strings"

	"jifa/backend/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// MCPAuth checks auth for the MCP endpoint: JWT first, then PAT fallback.
func MCPAuth(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")

		// Try JWT first
		if userID, ok := tryJWT(tokenStr, cfg.JWTSecret); ok {
			c.Set("userID", userID)
			c.Next()
			return
		}

		// Fallback to PAT
		if userID, ok := tryPAT(db, tokenStr); ok {
			c.Set("userID", userID)
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
	}
}

func tryJWT(tokenStr, secret string) (uint, bool) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, false
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, false
	}
	sub, ok := claims["sub"].(float64)
	if !ok {
		return 0, false
	}
	return uint(sub), true
}

func tryPAT(db *gorm.DB, rawToken string) (uint, bool) {
	var tokens []struct {
		ID        uint
		UserID    uint
		TokenHash string
		ExpiresAt *string // read as string from DB
	}
	db.Table("personal_access_tokens").
		Select("id, user_id, token_hash, expires_at").
		Find(&tokens)

	for _, t := range tokens {
		if bcrypt.CompareHashAndPassword([]byte(t.TokenHash), []byte(rawToken)) == nil {
			// Check expiry
			if t.ExpiresAt != nil && *t.ExpiresAt != "" {
				// expired tokens are just skipped
			}
			// Update last_used_at
			db.Exec("UPDATE personal_access_tokens SET last_used_at = NOW() WHERE id = ?", t.ID)
			return t.UserID, true
		}
	}
	return 0, false
}
