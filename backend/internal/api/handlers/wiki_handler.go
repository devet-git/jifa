package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WikiHandler struct{ db *gorm.DB }

func NewWikiHandler(db *gorm.DB) *WikiHandler { return &WikiHandler{db: db} }

// canViewAllWiki returns true if the caller has the wiki.view permission set
// by LoadProjectPermissions. Authors always retain access to their own pages
// regardless of this flag.
func canViewAllWiki(c *gin.Context) bool {
	raw, ok := c.Get("permissions")
	if !ok {
		return false
	}
	perms, ok := raw.(map[string]bool)
	if !ok {
		return false
	}
	return perms["wiki.view"]
}

func (h *WikiHandler) List(c *gin.Context) {
	var pages []models.WikiPage
	q := h.db.Preload("Author").
		Where("project_id = ?", c.Param("projectId")).
		Omit("content").
		Order("updated_at DESC")
	// Members without wiki.view only see pages they authored.
	if !canViewAllWiki(c) {
		q = q.Where("author_id = ?", c.GetUint("userID"))
	}
	q.Find(&pages)
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
		respondInternal(c, err)
		return
	}
	h.db.Preload("Author").First(&page, page.ID)
	webhook.Dispatch(h.db, page.ProjectID, models.EventWikiPageCreated, page)
	c.JSON(http.StatusCreated, page)
}

func (h *WikiHandler) Get(c *gin.Context) {
	var page models.WikiPage
	if err := h.db.Preload("Author").First(&page, c.Param("pageId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	// Without wiki.view, a user can still read their own pages but not
	// other members'. Return 404 instead of 403 to avoid leaking existence.
	if !canViewAllWiki(c) && page.AuthorID != c.GetUint("userID") {
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
	// Authors can always edit their own pages; otherwise wiki.edit is required.
	uid := c.GetUint("userID")
	if page.AuthorID != uid {
		raw, _ := c.Get("permissions")
		perms, _ := raw.(map[string]bool)
		if !perms["wiki.edit"] {
			c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
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
	if len(updates) > 0 {
		webhook.Dispatch(h.db, page.ProjectID, models.EventWikiPageUpdated, page)
	}
	c.JSON(http.StatusOK, page)
}

func (h *WikiHandler) Delete(c *gin.Context) {
	var page models.WikiPage
	if err := h.db.First(&page, c.Param("pageId")).Error; err != nil {
		c.Status(http.StatusNoContent)
		return
	}
	// Authors can always delete their own pages; otherwise wiki.delete is required.
	uid := c.GetUint("userID")
	if page.AuthorID != uid {
		raw, _ := c.Get("permissions")
		perms, _ := raw.(map[string]bool)
		if !perms["wiki.delete"] {
			c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
	}
	h.db.Delete(&page)
	webhook.Dispatch(h.db, page.ProjectID, models.EventWikiPageDeleted, gin.H{
		"page_id": page.ID,
		"title":   page.Title,
	})
	c.Status(http.StatusNoContent)
}
