package handlers

import (
	"errors"
	"net/http"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LinkHandler struct{ db *gorm.DB }

func NewLinkHandler(db *gorm.DB) *LinkHandler { return &LinkHandler{db: db} }

// List returns every link where this issue is the source or the target. The
// payload includes Source/Target preloaded so the UI can render either side.
func (h *LinkHandler) List(c *gin.Context) {
	var links []models.IssueLink
	h.db.Preload("Source").Preload("Source.Project").
		Preload("Target").Preload("Target.Project").
		Where("source_id = ? OR target_id = ?", c.Param("id"), c.Param("id")).
		Find(&links)
	for i := range links {
		if links[i].Source != nil {
			setIssueKey(links[i].Source)
		}
		if links[i].Target != nil {
			setIssueKey(links[i].Target)
		}
	}
	c.JSON(http.StatusOK, links)
}

type createLinkRequest struct {
	Type     models.IssueLinkType `json:"type" binding:"required"`
	TargetID uint                 `json:"target_id" binding:"required"`
}

func (h *LinkHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")
	sourceID := parseParamUint(c, "id")
	if sourceID == 0 {
		return
	}
	var req createLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !models.ValidLinkType(req.Type) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid link type"})
		return
	}
	if req.TargetID == sourceID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot link issue to itself"})
		return
	}

	var target models.Issue
	if err := h.db.First(&target, req.TargetID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "target issue not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	link := models.IssueLink{
		Type:     req.Type,
		SourceID: sourceID,
		TargetID: req.TargetID,
	}
	if err := h.db.Create(&link).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "link already exists"})
		return
	}
	h.db.Preload("Source.Project").Preload("Target.Project").First(&link, link.ID)
	if link.Source != nil {
		setIssueKey(link.Source)
	}
	if link.Target != nil {
		setIssueKey(link.Target)
	}

	// Notify watchers of both ends so they see "blocked by X" appear.
	dispatchToWatchers(h.db, sourceID, userID.(uint), func(uid uint) *models.Notification {
		return &models.Notification{
			UserID:  uid,
			Type:    models.NotifLinkAdded,
			IssueID: &sourceID,
			Body:    string(req.Type) + " → " + target.Title,
		}
	})
	dispatchToWatchers(h.db, req.TargetID, userID.(uint), func(uid uint) *models.Notification {
		return &models.Notification{
			UserID:  uid,
			Type:    models.NotifLinkAdded,
			IssueID: &req.TargetID,
			Body:    "linked from " + link.Source.Title,
		}
	})

	c.JSON(http.StatusCreated, link)
}

func (h *LinkHandler) Delete(c *gin.Context) {
	h.db.Where("id = ?", c.Param("linkId")).Delete(&models.IssueLink{})
	c.Status(http.StatusNoContent)
}
