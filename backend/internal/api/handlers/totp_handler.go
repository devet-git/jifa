package handlers

import (
	"net/http"

	"jifa/backend/internal/models"
	"jifa/backend/internal/pkg/totp"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type TotpHandler struct {
	db *gorm.DB
}

func NewTotpHandler(db *gorm.DB) *TotpHandler { return &TotpHandler{db: db} }

// GET /auth/totp/setup  — generates a new secret and stores it (pending, not yet enabled)
func (h *TotpHandler) Setup(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	secret, err := totp.GenerateSecret()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate secret"})
		return
	}

	h.db.Model(&user).Update("totp_secret", secret)

	c.JSON(http.StatusOK, gin.H{
		"secret":      secret,
		"otpauth_url": totp.OTPAuthURL("Jifa", user.Email, secret),
	})
}

// POST /auth/totp/enable  — { "code": "123456" }
func (h *TotpHandler) Enable(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if user.TotpSecret == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "setup not started — call /auth/totp/setup first"})
		return
	}
	if !totp.Validate(*user.TotpSecret, req.Code) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authenticator code"})
		return
	}

	h.db.Model(&user).Update("totp_enabled", true)
	c.JSON(http.StatusOK, gin.H{"totp_enabled": true})
}

// POST /auth/totp/disable  — { "password": "..." }
func (h *TotpHandler) Disable(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid password"})
		return
	}

	h.db.Model(&user).Updates(map[string]any{"totp_secret": nil, "totp_enabled": false})
	c.JSON(http.StatusOK, gin.H{"totp_enabled": false})
}
