package handlers

import (
	"net/http"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct{ db *gorm.DB }

func NewUserHandler(db *gorm.DB) *UserHandler { return &UserHandler{db: db} }

func (h *UserHandler) List(c *gin.Context) {
	var users []models.User
	h.db.Select("id, name, email, avatar, created_at").Find(&users)
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) Me(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")
	var body struct {
		Name   string `json:"name"`
		Avatar string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.db.Model(&models.User{}).Where("id = ?", userID).Updates(body)
	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, _ := c.Get("userID")
	var body struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.CurrentPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "current password is incorrect"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	h.db.Model(&user).Update("password", string(hashed))
	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

func (h *UserHandler) GetPreferences(c *gin.Context) {
	userID, _ := c.Get("userID")

	var appearance models.UserAppearance
	err := h.db.Where("user_id = ?", userID).First(&appearance).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			d := models.DefaultUserPreferences()
			appearance = models.UserAppearance{UserID: userID.(uint), Preferences: d}
			h.db.Create(&appearance)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load preferences"})
			return
		}
	}

	prefs := appearance.Preferences
	if prefs.FontSize == "" {
		prefs = models.DefaultUserPreferences()
	}
	c.JSON(http.StatusOK, prefs)
}

type updatePreferencesBody struct {
	FontSize    *string `json:"font_size"`
	FontFamily  *string `json:"font_family"`
	AccentColor *string `json:"accent_color"`
}

func (h *UserHandler) UpdatePreferences(c *gin.Context) {
	userID, _ := c.Get("userID")

	var body updatePreferencesBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var appearance models.UserAppearance
	err := h.db.Where("user_id = ?", userID).First(&appearance).Error
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load preferences"})
			return
		}
		d := models.DefaultUserPreferences()
		appearance = models.UserAppearance{UserID: userID.(uint), Preferences: d}
		h.db.Create(&appearance)
	}

	prefs := appearance.Preferences
	if prefs.FontSize == "" {
		prefs = models.DefaultUserPreferences()
	}
	if body.FontSize != nil {
		prefs.FontSize = *body.FontSize
	}
	if body.FontFamily != nil {
		prefs.FontFamily = *body.FontFamily
	}
	if body.AccentColor != nil {
		prefs.AccentColor = *body.AccentColor
	}

	appearance.Preferences = prefs
	h.db.Model(&appearance).Update("preferences", prefs)
	c.JSON(http.StatusOK, prefs)
}
