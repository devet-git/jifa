package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WikiHandler struct{ db *gorm.DB }

func NewWikiHandler(db *gorm.DB) *WikiHandler { return &WikiHandler{db: db} }

func (h *WikiHandler) List(c *gin.Context) {
	var pages []models.WikiPage
	h.db.Where("project_id = ?", c.Param("projectId")).
		Omit("content").
		Order("updated_at DESC").
		Find(&pages)
	c.JSON(http.StatusOK, pages)
}

func (h *WikiHandler) Create(c *gin.Context) {
	pid, err := strconv.ParseUint(c.Param("projectId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}
	var body struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := c.GetUint("userID")
	page := models.WikiPage{
		ProjectID: uint(pid),
		Title:     body.Title,
		Content:   body.Content,
		AuthorID:  userID,
	}
	if err := h.db.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.db.Preload("Author").First(&page, page.ID)
	c.JSON(http.StatusCreated, page)
}

func (h *WikiHandler) Get(c *gin.Context) {
	var page models.WikiPage
	if err := h.db.Preload("Author").First(&page, c.Param("pageId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	c.JSON(http.StatusOK, page)
}

func (h *WikiHandler) Update(c *gin.Context) {
	var page models.WikiPage
	if err := h.db.First(&page, c.Param("pageId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	var body struct {
		Title   *string `json:"title"`
		Content *string `json:"content"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]any{}
	if body.Title != nil {
		updates["title"] = *body.Title
	}
	if body.Content != nil {
		updates["content"] = *body.Content
	}
	if len(updates) > 0 {
		h.db.Model(&page).Updates(updates)
	}
	h.db.Preload("Author").First(&page, page.ID)
	c.JSON(http.StatusOK, page)
}

func (h *WikiHandler) Delete(c *gin.Context) {
	h.db.Delete(&models.WikiPage{}, c.Param("pageId"))
	c.Status(http.StatusNoContent)
}
