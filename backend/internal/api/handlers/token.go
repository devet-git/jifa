package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type TokenHandler struct{ db *gorm.DB }

func NewTokenHandler(db *gorm.DB) *TokenHandler { return &TokenHandler{db: db} }

type createTokenRequest struct {
	Name      string     `json:"name" binding:"required"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type tokenResponse struct {
	ID        uint       `json:"id"`
	Name      string     `json:"name"`
	LastChars string     `json:"last_chars"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	Token     string     `json:"token,omitempty"`
}

func (h *TokenHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	var tokens []models.PersonalAccessToken
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&tokens)
	out := make([]tokenResponse, len(tokens))
	for i, t := range tokens {
		out[i] = tokenResponse{
			ID:         t.ID,
			Name:       t.Name,
			LastChars:  t.LastChars,
			ExpiresAt:  t.ExpiresAt,
			LastUsedAt: t.LastUsedAt,
			CreatedAt:  t.CreatedAt,
		}
	}
	c.JSON(http.StatusOK, out)
}

func (h *TokenHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req createTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}
	rawToken := "jifa_pat_" + hex.EncodeToString(raw)

	hashed, err := bcrypt.GenerateFromPassword([]byte(rawToken), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash token"})
		return
	}

	lastChars := rawToken[len(rawToken)-4:]
	if len(rawToken) < 4 {
		lastChars = rawToken
	}

	token := models.PersonalAccessToken{
		UserID:    userID.(uint),
		Name:      req.Name,
		TokenHash: string(hashed),
		LastChars: lastChars,
		ExpiresAt: req.ExpiresAt,
	}
	if err := h.db.Create(&token).Error; err != nil {
		respondInternal(c, err)
		return
	}

	c.JSON(http.StatusCreated, tokenResponse{
		ID:         token.ID,
		Name:       token.Name,
		LastChars:  token.LastChars,
		ExpiresAt:  token.ExpiresAt,
		CreatedAt:  token.CreatedAt,
		Token:      rawToken,
	})
}

func (h *TokenHandler) Delete(c *gin.Context) {
	userID, _ := c.Get("userID")
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	result := h.db.Where("user_id = ?", userID).Delete(&models.PersonalAccessToken{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "token not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
