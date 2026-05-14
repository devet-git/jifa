package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BoardHandler struct{ db *gorm.DB }

func NewBoardHandler(db *gorm.DB) *BoardHandler { return &BoardHandler{db: db} }

type boardDTO struct {
	Name   string `json:"name" binding:"required,max=120"`
	Filter string `json:"filter"`
}

func (h *BoardHandler) List(c *gin.Context) {
	var boards []models.Board
	h.db.Where("project_id = ?", c.Param("projectId")).
		Order("name ASC").Find(&boards)
	c.JSON(http.StatusOK, boards)
}

func (h *BoardHandler) Get(c *gin.Context) {
	var board models.Board
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&board, c.Param("boardId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}
	c.JSON(http.StatusOK, board)
}

func (h *BoardHandler) Create(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto boardDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if dto.Filter == "" {
		dto.Filter = "{}"
	}
	b := models.Board{
		ProjectID: uint(pid),
		Name:      dto.Name,
		Filter:    dto.Filter,
	}
	if err := h.db.Create(&b).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *BoardHandler) Update(c *gin.Context) {
	var b models.Board
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&b, c.Param("boardId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}
	var dto boardDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	b.Name = dto.Name
	if dto.Filter != "" {
		b.Filter = dto.Filter
	}
	h.db.Save(&b)
	c.JSON(http.StatusOK, b)
}

func (h *BoardHandler) Delete(c *gin.Context) {
	h.db.Where("project_id = ?", c.Param("projectId")).
		Delete(&models.Board{}, c.Param("boardId"))
	c.Status(http.StatusNoContent)
}
