package mcp

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/server"
)

func GinHandler(sseServer *server.SSEServer) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		ctx := context.WithValue(c.Request.Context(), ctxKeyUserID, userID)
		c.Request = c.Request.WithContext(ctx)
		sseServer.ServeHTTP(c.Writer, c.Request)
	}
}
