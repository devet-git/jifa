package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"jifa/backend/config"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AttachmentHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAttachmentHandler(db *gorm.DB, cfg *config.Config) *AttachmentHandler {
	return &AttachmentHandler{db: db, cfg: cfg}
}

const maxUploadBytes = 25 * 1024 * 1024 // 25 MB

func (h *AttachmentHandler) List(c *gin.Context) {
	var atts []models.Attachment
	h.db.Preload("Uploader").
		Where("issue_id = ?", c.Param("id")).
		Order("created_at DESC").
		Find(&atts)
	c.JSON(http.StatusOK, atts)
}

func (h *AttachmentHandler) Upload(c *gin.Context) {
	userID, _ := c.Get("userID")
	issueID := parseParamUint(c, "id")
	if issueID == 0 {
		return
	}

	// Resolve project so we can lay out the file path predictably.
	var issue models.Issue
	if err := h.db.Select("id, project_id").First(&issue, issueID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}
	defer file.Close()

	if header.Size > maxUploadBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"error": fmt.Sprintf("file exceeds %d bytes", maxUploadBytes),
		})
		return
	}

	storedName, err := storedName(header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	relDir := filepath.Join(
		fmt.Sprintf("p%d", issue.ProjectID),
		fmt.Sprintf("i%d", issue.ID),
	)
	absDir := filepath.Join(h.cfg.UploadDir, relDir)
	if err := os.MkdirAll(absDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	storedPath := filepath.Join(relDir, storedName)
	absPath := filepath.Join(h.cfg.UploadDir, storedPath)

	dst, err := os.OpenFile(absPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	written, err := io.Copy(dst, file)
	dst.Close()
	if err != nil {
		_ = os.Remove(absPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	att := models.Attachment{
		IssueID:          issue.ID,
		UploaderID:       userID.(uint),
		OriginalFilename: header.Filename,
		StoredPath:       filepath.ToSlash(storedPath),
		MimeType:         header.Header.Get("Content-Type"),
		Size:             written,
	}
	if err := h.db.Create(&att).Error; err != nil {
		_ = os.Remove(absPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.db.Preload("Uploader").First(&att, att.ID)
	c.JSON(http.StatusCreated, att)
}

// Download streams the file. Auth is enforced by the route group; we still
// verify the attachment really belongs to the issue param.
func (h *AttachmentHandler) Download(c *gin.Context) {
	var att models.Attachment
	if err := h.db.Where("issue_id = ?", c.Param("id")).
		First(&att, c.Param("attachmentId")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	abs := filepath.Join(h.cfg.UploadDir, filepath.FromSlash(att.StoredPath))
	// Defence in depth: make sure the resolved path stays inside UploadDir.
	rootAbs, _ := filepath.Abs(h.cfg.UploadDir)
	resolvedAbs, _ := filepath.Abs(abs)
	if !strings.HasPrefix(resolvedAbs, rootAbs+string(os.PathSeparator)) &&
		resolvedAbs != rootAbs {
		c.JSON(http.StatusForbidden, gin.H{"error": "path traversal"})
		return
	}
	if att.MimeType != "" {
		c.Header("Content-Type", att.MimeType)
	}
	c.Header("Content-Disposition",
		fmt.Sprintf(`inline; filename="%s"`, sanitizeFilenameHeader(att.OriginalFilename)))
	c.File(abs)
}

func (h *AttachmentHandler) Delete(c *gin.Context) {
	var att models.Attachment
	if err := h.db.Where("issue_id = ?", c.Param("id")).
		First(&att, c.Param("attachmentId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
		return
	}
	abs := filepath.Join(h.cfg.UploadDir, filepath.FromSlash(att.StoredPath))
	_ = os.Remove(abs)
	h.db.Delete(&att)
	c.Status(http.StatusNoContent)
}

// storedName returns a random-prefixed filename preserving the original
// extension. Random prefix avoids collisions and makes file URLs unguessable
// without auth (defence in depth — auth is still enforced separately).
func storedName(original string) (string, error) {
	ext := strings.ToLower(filepath.Ext(original))
	if len(ext) > 16 { // weird ext, drop it
		ext = ""
	}
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + ext, nil
}

// sanitizeFilenameHeader strips characters that break HTTP headers.
func sanitizeFilenameHeader(s string) string {
	s = strings.ReplaceAll(s, "\"", "")
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "")
	return s
}
