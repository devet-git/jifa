package mcp

import (
	"context"
	"net/http"
	"strconv"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"gorm.io/gorm"
)

func NewSSEServer(db *gorm.DB, basePath string) *server.SSEServer {
	mcpServer := server.NewMCPServer("jifa", "1.0.0")

	registerAllTools(mcpServer, db)

	return server.NewSSEServer(mcpServer,
		server.WithBasePath(basePath),
		server.WithSSEEndpoint("/sse"),
		server.WithMessageEndpoint("/message"),
		server.WithSSEContextFunc(func(ctx context.Context, r *http.Request) context.Context {
			if userID, ok := r.Context().Value(ctxKeyUserID).(uint); ok {
				ctx = context.WithValue(ctx, ctxKeyUserID, userID)
			}
			return ctx
		}),
	)
}

type ctxKey string

const ctxKeyUserID ctxKey = "userID"

func userIDFromContext(ctx context.Context) uint {
	if v, ok := ctx.Value(ctxKeyUserID).(uint); ok {
		return v
	}
	return 0
}

func textResult(text string) *mcp.CallToolResult {
	return mcp.NewToolResultText(text)
}

func jsonResult[T any](data T) *mcp.CallToolResult {
	r, err := mcp.NewToolResultJSON(data)
	if err != nil {
		return mcp.NewToolResultError("serialization error: " + err.Error())
	}
	return r
}

func errorResult(msg string) *mcp.CallToolResult {
	return mcp.NewToolResultError(msg)
}

func parseUint(s string) (uint, error) {
	v, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(v), nil
}

func registerAllTools(mcpServer *server.MCPServer, db *gorm.DB) {
	// Projects
	mcpServer.AddTool(projectListToolDef, projectListHandler(db))
	mcpServer.AddTool(projectGetToolDef, projectGetHandler(db))

	// Issues
	mcpServer.AddTool(issueListToolDef, issueListHandler(db))
	mcpServer.AddTool(issueGetToolDef, issueGetHandler(db))
	mcpServer.AddTool(issueCreateToolDef, issueCreateHandler(db))

	// Sprints
	mcpServer.AddTool(sprintListToolDef, sprintListHandler(db))
	mcpServer.AddTool(sprintGetToolDef, sprintGetHandler(db))

	// Versions
	mcpServer.AddTool(versionListToolDef, versionListHandler(db))
	mcpServer.AddTool(versionGetToolDef, versionGetHandler(db))

	// Wiki
	mcpServer.AddTool(wikiListToolDef, wikiListHandler(db))
	mcpServer.AddTool(wikiGetToolDef, wikiGetHandler(db))

	// Members
	mcpServer.AddTool(memberListToolDef, memberListHandler(db))

	// Comments
	mcpServer.AddTool(commentAddToolDef, commentAddHandler(db))
}

func memberIDs(db *gorm.DB, userID uint) []uint {
	var memberProjects []struct{ ProjectID uint }
	db.Table("members").Select("project_id").Where("user_id = ?", userID).Find(&memberProjects)
	ids := make([]uint, len(memberProjects))
	for i, m := range memberProjects {
		ids[i] = m.ProjectID
	}
	return ids
}


