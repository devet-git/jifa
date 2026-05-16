package handlers

import (
	"errors"
	"net/http"
	"strings"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WikiCommentHandler struct{ db *gorm.DB }

func NewWikiCommentHandler(db *gorm.DB) *WikiCommentHandler {
	return &WikiCommentHandler{db: db}
}

func (h *WikiCommentHandler) List(c *gin.Context) {
	var page models.WikiPage
	if err := h.db.First(&page, c.Param("pageId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	var comments []models.WikiComment
	h.db.Preload("Author").
		Where("wiki_page_id = ?", c.Param("pageId")).
		Order("created_at ASC").
		Find(&comments)
	c.JSON(http.StatusOK, comments)
}

func (h *WikiCommentHandler) Create(c *gin.Context) {
	userID := c.GetUint("userID")
	pageID := c.Param("pageId")

	var page models.WikiPage
	if err := h.db.First(&page, pageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}

	var body struct {
		Body           string `json:"body" binding:"required"`
		MentionUserIDs []uint `json:"mention_user_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment := models.WikiComment{
		Body:       body.Body,
		WikiPageID: page.ID,
		AuthorID:   userID,
	}
	h.db.Create(&comment)
	h.db.Preload("Author").First(&comment, comment.ID)

	webhook.Dispatch(h.db, page.ProjectID, models.EventWikiCommentCreated, gin.H{
		"wiki_page_id": page.ID,
		"comment":      comment,
	})

	mentioned := map[uint]bool{}
	for _, uid := range body.MentionUserIDs {
		if uid == 0 || uid == userID {
			continue
		}
		mentioned[uid] = true
		dispatch(h.db, &models.Notification{
			UserID:     uid,
			Type:       models.NotifMention,
			WikiPageID: &page.ID,
			CommentID:  &comment.ID,
			Body:       body.Body,
		}, userID)
		_ = EnsureWikiWatcher(h.db, page.ID, uid)
		webhook.Dispatch(h.db, page.ProjectID, models.EventWikiCommentMentioned, gin.H{
			"wiki_page_id":      page.ID,
			"comment":           comment,
			"mentioned_user_id": uid,
		})
	}

	if page.AuthorID != userID && !mentioned[page.AuthorID] {
		dispatch(h.db, &models.Notification{
			UserID:     page.AuthorID,
			Type:       models.NotifComment,
			WikiPageID: &page.ID,
			CommentID:  &comment.ID,
			Body:       body.Body,
		}, userID)
	}

	dispatchToWikiWatchers(h.db, page.ID, userID, func(uid uint) *models.Notification {
		if uid == page.AuthorID || mentioned[uid] {
			return nil
		}
		return &models.Notification{
			UserID:     uid,
			Type:       models.NotifComment,
			WikiPageID: &page.ID,
			CommentID:  &comment.ID,
			Body:       body.Body,
		}
	})

	_ = EnsureWikiWatcher(h.db, page.ID, userID)

	c.JSON(http.StatusCreated, comment)
}

func (h *WikiCommentHandler) Update(c *gin.Context) {
	userID := c.GetUint("userID")
	var comment models.WikiComment
	if err := h.db.First(&comment, c.Param("commentId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}
	if comment.AuthorID != userID && !isCommentAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the author or an admin can edit this comment"})
		return
	}
	var body struct {
		Body string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.db.Model(&comment).Update("body", body.Body)
	h.db.Preload("Author").First(&comment, comment.ID)

	var page models.WikiPage
	if err := h.db.Select("project_id").First(&page, comment.WikiPageID).Error; err == nil {
		webhook.Dispatch(h.db, page.ProjectID, models.EventWikiCommentUpdated, gin.H{
			"wiki_page_id": comment.WikiPageID,
			"comment":      comment,
		})
	}
	c.JSON(http.StatusOK, comment)
}

func (h *WikiCommentHandler) Delete(c *gin.Context) {
	userID := c.GetUint("userID")
	var comment models.WikiComment
	if err := h.db.First(&comment, c.Param("commentId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}
	if comment.AuthorID != userID && !isCommentAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the author or an admin can delete this comment"})
		return
	}
	var page models.WikiPage
	if err := h.db.Select("project_id").First(&page, comment.WikiPageID).Error; err == nil {
		h.db.Delete(&comment)
		webhook.Dispatch(h.db, page.ProjectID, models.EventWikiCommentDeleted, gin.H{
			"wiki_page_id": comment.WikiPageID,
			"comment_id":   comment.ID,
		})
	} else {
		h.db.Delete(&comment)
	}
	c.Status(http.StatusNoContent)
}

func (h *WikiCommentHandler) Watch(c *gin.Context) {
	userID := c.GetUint("userID")
	pageID := c.Param("pageId")
	var page models.WikiPage
	if err := h.db.First(&page, pageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	if err := EnsureWikiWatcher(h.db, page.ID, userID); err != nil {
		respondInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *WikiCommentHandler) Unwatch(c *gin.Context) {
	userID := c.GetUint("userID")
	pageID := c.Param("pageId")
	var page models.WikiPage
	if err := h.db.First(&page, pageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}
	h.db.Where("wiki_page_id = ? AND user_id = ?", page.ID, userID).
		Delete(&models.WikiWatcher{})
	c.Status(http.StatusNoContent)
}

func (h *WikiCommentHandler) ListWatchers(c *gin.Context) {
	pageID := c.Param("pageId")
	var ws []models.WikiWatcher
	h.db.Preload("User").
		Where("wiki_page_id = ?", pageID).
		Order("created_at ASC").
		Find(&ws)
	c.JSON(http.StatusOK, ws)
}

func isCommentAdmin(c *gin.Context) bool {
	raw, ok := c.Get("permissions")
	if !ok {
		return false
	}
	perms, ok := raw.(map[string]bool)
	if !ok {
		return false
	}
	return perms["project.edit"] || perms["member.invite"]
}

func EnsureWikiWatcher(db *gorm.DB, pageID, userID uint) error {
	var existing models.WikiWatcher
	err := db.Unscoped().
		Where("wiki_page_id = ? AND user_id = ?", pageID, userID).
		First(&existing).Error
	if err == nil {
		if existing.DeletedAt.Valid {
			return db.Unscoped().Model(&existing).
				UpdateColumn("deleted_at", nil).Error
		}
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	err = db.Create(&models.WikiWatcher{WikiPageID: pageID, UserID: userID}).Error
	if err != nil && strings.Contains(err.Error(), "idx_wiki_watcher_unique") {
		return nil
	}
	return err
}

func dispatchToWikiWatchers(db *gorm.DB, pageID, actorID uint, build func(uint) *models.Notification) {
	var watchers []models.WikiWatcher
	db.Select("user_id").Where("wiki_page_id = ?", pageID).Find(&watchers)
	for _, w := range watchers {
		n := build(w.UserID)
		if n == nil {
			continue
		}
		dispatch(db, n, actorID)
	}
}
