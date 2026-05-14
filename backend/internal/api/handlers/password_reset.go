package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"jifa/backend/config"
	"jifa/backend/internal/mailer"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type PasswordResetHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewPasswordResetHandler(db *gorm.DB, cfg *config.Config) *PasswordResetHandler {
	return &PasswordResetHandler{db: db, cfg: cfg}
}

func (h *PasswordResetHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Always return 200 regardless — don't leak whether email exists.
	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err == nil {
		b := make([]byte, 32)
		if _, err := rand.Read(b); err == nil {
			token := hex.EncodeToString(b)
			h.db.Create(&models.PasswordResetToken{
				UserID:    user.ID,
				Token:     token,
				ExpiresAt: time.Now().Add(time.Hour),
			})
			resetURL := fmt.Sprintf("%s/reset-password?token=%s", h.cfg.AppURL, token)
			mailer.Send([]string{user.Email}, "Reset your Jifa password",
				fmt.Sprintf(`<p>Hi %s,</p><p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="%s">%s</a></p>`,
					user.Name, resetURL, resetURL))
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "If your email is registered, you'll receive a reset link shortly."})
}

func (h *PasswordResetHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var reset models.PasswordResetToken
	if err := h.db.Where("token = ? AND used_at IS NULL AND expires_at > ?", req.Token, time.Now()).
		First(&reset).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired token"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", reset.UserID).
		Update("password", string(hashed)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	h.db.Model(&reset).Update("used_at", now)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully."})
}
