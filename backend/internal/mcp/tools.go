package mcp

import (
	"context"
	"time"

	"jifa/backend/internal/models"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

var projectListToolDef = mcp.NewTool("list_projects",
	mcp.WithDescription("List all projects the current user is a member of"),
)

func projectListHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userID := userIDFromContext(ctx)
		pids := memberIDs(db, userID)
		if len(pids) == 0 {
			return textResult("[]"), nil
		}
		var projects []models.Project
		db.Where("id IN ?", pids).Order("name ASC").Find(&projects)

		type miniProject struct {
			ID   uint   `json:"id"`
			Name string `json:"name"`
			Key  string `json:"key"`
		}
		out := make([]miniProject, len(projects))
		for i, p := range projects {
			out[i] = miniProject{ID: p.ID, Name: p.Name, Key: p.Key}
		}
		return jsonResult(out), nil
	}
}

var projectGetToolDef = mcp.NewTool("get_project",
	mcp.WithDescription("Get detailed project information by ID"),
	mcp.WithString("project_id", mcp.Required(), mcp.Description("Project ID")),
)

func projectGetHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		pid, err := parseUint(req.GetString("project_id", ""))
		if err != nil {
			return errorResult("invalid project_id"), nil
		}
		var project models.Project
		if err := db.Preload("Owner").First(&project, pid).Error; err != nil {
			return errorResult("project not found"), nil
		}
		return jsonResult(project), nil
	}
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

var issueListToolDef = mcp.NewTool("list_issues",
	mcp.WithDescription("List issues, optionally filtered by project, status, type, or assignee"),
	mcp.WithString("project_id", mcp.Description("Filter by project ID")),
	mcp.WithString("status", mcp.Description("Filter by status (todo, in_progress, in_review, done)")),
	mcp.WithString("type", mcp.Description("Filter by type (task, bug, story, epic, subtask)")),
	mcp.WithString("assignee_id", mcp.Description("Filter by assignee user ID")),
	mcp.WithString("q", mcp.Description("Search in title")),
	mcp.WithString("limit", mcp.Description("Max results (default 50)")),
)

func issueListHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userID := userIDFromContext(ctx)
		pids := memberIDs(db, userID)
		if len(pids) == 0 {
			return jsonResult([]any{}), nil
		}

		q := db.Where("project_id IN ?", pids)

		if pid := req.GetString("project_id", ""); pid != "" {
			q = q.Where("project_id = ?", pid)
		}
		if status := req.GetString("status", ""); status != "" {
			q = q.Where("status = ?", status)
		}
		if typ := req.GetString("type", ""); typ != "" {
			q = q.Where("type = ?", typ)
		}
		if aid := req.GetString("assignee_id", ""); aid != "" {
			q = q.Where("assignee_id = ?", aid)
		}
		if search := req.GetString("q", ""); search != "" {
			q = q.Where("title ILIKE ?", "%"+search+"%")
		}

		limit := 50
		if l := req.GetString("limit", ""); l != "" {
			if n, err := parseUint(l); err == nil && n > 0 {
				limit = int(n)
			}
		}

		var issues []models.Issue
		q.Preload("Project").Preload("Assignee").
			Order("created_at DESC").Limit(limit).Find(&issues)

		type miniIssue struct {
			ID       uint   `json:"id"`
			Number   uint   `json:"number"`
			Title    string `json:"title"`
			Type     string `json:"type"`
			Status   string `json:"status"`
			Priority string `json:"priority"`
			Project  string `json:"project_key"`
		}
		out := make([]miniIssue, len(issues))
		for i, iss := range issues {
			out[i] = miniIssue{
				ID: iss.ID, Number: iss.Number, Title: iss.Title,
				Type: string(iss.Type), Status: string(iss.Status),
				Priority: string(iss.Priority), Project: iss.Project.Key,
			}
		}
		return jsonResult(out), nil
	}
}

var issueGetToolDef = mcp.NewTool("get_issue",
	mcp.WithDescription("Get detailed issue information by ID"),
	mcp.WithString("issue_id", mcp.Required(), mcp.Description("Issue ID")),
)

func issueGetHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		iid, err := parseUint(req.GetString("issue_id", ""))
		if err != nil {
			return errorResult("invalid issue_id"), nil
		}
		var issue models.Issue
		if err := db.Preload("Project").Preload("Assignee").Preload("Labels").
			Preload("Components").First(&issue, iid).Error; err != nil {
			return errorResult("issue not found"), nil
		}
		return jsonResult(issue), nil
	}
}

var issueCreateToolDef = mcp.NewTool("create_issue",
	mcp.WithDescription("Create a new issue in a project"),
	mcp.WithString("project_id", mcp.Required(), mcp.Description("Project ID")),
	mcp.WithString("title", mcp.Required(), mcp.Description("Issue title")),
	mcp.WithString("type", mcp.Description("Issue type: task, bug, story, epic, subtask")),
	mcp.WithString("priority", mcp.Description("Priority: low, medium, high, urgent")),
	mcp.WithString("description", mcp.Description("Detailed description")),
	mcp.WithString("assignee_id", mcp.Description("Assignee user ID")),
)

func issueCreateHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userID := userIDFromContext(ctx)

		pid, err := parseUint(req.GetString("project_id", ""))
		if err != nil {
			return errorResult("invalid project_id"), nil
		}

		title := req.GetString("title", "")
		if title == "" {
			return errorResult("title is required"), nil
		}

		issue := models.Issue{
			ProjectID: pid,
			Title:     title,
			Type:      models.IssueType(req.GetString("type", "task")),
			Priority:  models.IssuePriority(req.GetString("priority", "medium")),
		}
		if desc := req.GetString("description", ""); desc != "" {
			issue.Description = desc
		}
		if aid := req.GetString("assignee_id", ""); aid != "" {
			if id, err := parseUint(aid); err == nil {
				issue.AssigneeID = &id
			}
		}

		if err := db.Transaction(func(tx *gorm.DB) error {
			var proj models.Project
			if err := tx.Select("issue_seq").First(&proj, pid).Error; err != nil {
				return err
			}
			issue.Number = proj.IssueSeq + 1
			issue.Rank = float64(time.Now().UnixMilli())
			if err := tx.Create(&issue).Error; err != nil {
				return err
			}
			return tx.Model(&models.Project{}).Where("id = ?", pid).
				Update("issue_seq", gorm.Expr("issue_seq + 1")).Error
		}); err != nil {
			return errorResult("failed to create issue: " + err.Error()), nil
		}

		uid := userID
		db.Create(&models.IssueActivity{
			IssueID:  issue.ID,
			UserID:   &uid,
			Field:    "status",
			OldValue: "",
			NewValue: string(issue.Status),
		})

		return jsonResult(issue), nil
	}
}

// ---------------------------------------------------------------------------
// Sprints
// ---------------------------------------------------------------------------

var sprintListToolDef = mcp.NewTool("list_sprints",
	mcp.WithDescription("List sprints for a project"),
	mcp.WithString("project_id", mcp.Required(), mcp.Description("Project ID")),
	mcp.WithString("status", mcp.Description("Filter by status: planned, active, completed")),
)

func sprintListHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		pid, err := parseUint(req.GetString("project_id", ""))
		if err != nil {
			return errorResult("invalid project_id"), nil
		}
		q := db.Where("project_id = ?", pid)
		if s := req.GetString("status", ""); s != "" {
			q = q.Where("status = ?", s)
		}
		var sprints []models.Sprint
		q.Order("created_at DESC").Find(&sprints)
		return jsonResult(sprints), nil
	}
}

var sprintGetToolDef = mcp.NewTool("get_sprint",
	mcp.WithDescription("Get sprint details by ID"),
	mcp.WithString("sprint_id", mcp.Required(), mcp.Description("Sprint ID")),
)

func sprintGetHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		sid, err := parseUint(req.GetString("sprint_id", ""))
		if err != nil {
			return errorResult("invalid sprint_id"), nil
		}
		var sprint models.Sprint
		if err := db.First(&sprint, sid).Error; err != nil {
			return errorResult("sprint not found"), nil
		}
		return jsonResult(sprint), nil
	}
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

var versionListToolDef = mcp.NewTool("list_versions",
	mcp.WithDescription("List versions for a project"),
	mcp.WithString("project_id", mcp.Required(), mcp.Description("Project ID")),
)

func versionListHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		pid, err := parseUint(req.GetString("project_id", ""))
		if err != nil {
			return errorResult("invalid project_id"), nil
		}
		var versions []models.Version
		db.Where("project_id = ?", pid).Order("created_at DESC").Find(&versions)
		return jsonResult(versions), nil
	}
}

var versionGetToolDef = mcp.NewTool("get_version",
	mcp.WithDescription("Get version details by ID"),
	mcp.WithString("version_id", mcp.Required(), mcp.Description("Version ID")),
)

func versionGetHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		vid, err := parseUint(req.GetString("version_id", ""))
		if err != nil {
			return errorResult("invalid version_id"), nil
		}
		var version models.Version
		if err := db.First(&version, vid).Error; err != nil {
			return errorResult("version not found"), nil
		}
		return jsonResult(version), nil
	}
}

// ---------------------------------------------------------------------------
// Wiki
// ---------------------------------------------------------------------------

var wikiListToolDef = mcp.NewTool("list_wiki_pages",
	mcp.WithDescription("List wiki pages for a project"),
	mcp.WithString("project_id", mcp.Required(), mcp.Description("Project ID")),
)

func wikiListHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		pid, err := parseUint(req.GetString("project_id", ""))
		if err != nil {
			return errorResult("invalid project_id"), nil
		}
		var pages []models.WikiPage
		db.Where("project_id = ?", pid).Order("title ASC").Find(&pages)
		type miniPage struct {
			ID    uint   `json:"id"`
			Title string `json:"title"`
		}
		out := make([]miniPage, len(pages))
		for i, p := range pages {
			out[i] = miniPage{ID: p.ID, Title: p.Title}
		}
		return jsonResult(out), nil
	}
}

var wikiGetToolDef = mcp.NewTool("get_wiki_page",
	mcp.WithDescription("Get wiki page content by ID"),
	mcp.WithString("page_id", mcp.Required(), mcp.Description("Wiki page ID")),
)

func wikiGetHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		pid, err := parseUint(req.GetString("page_id", ""))
		if err != nil {
			return errorResult("invalid page_id"), nil
		}
		var page models.WikiPage
		if err := db.Preload("Author").First(&page, pid).Error; err != nil {
			return errorResult("wiki page not found"), nil
		}
		return jsonResult(page), nil
	}
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

var memberListToolDef = mcp.NewTool("list_members",
	mcp.WithDescription("List members of a project"),
	mcp.WithString("project_id", mcp.Required(), mcp.Description("Project ID")),
)

func memberListHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		pid, err := parseUint(req.GetString("project_id", ""))
		if err != nil {
			return errorResult("invalid project_id"), nil
		}
		var members []models.Member
		db.Preload("User").Where("project_id = ?", pid).Order("created_at ASC").Find(&members)

		type miniMember struct {
			ID   uint   `json:"id"`
			Name string `json:"name"`
			Role string `json:"role"`
		}
		out := make([]miniMember, len(members))
		for i, m := range members {
			out[i] = miniMember{ID: m.UserID, Name: m.User.Name, Role: string(m.Role)}
		}
		return jsonResult(out), nil
	}
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

var commentAddToolDef = mcp.NewTool("add_comment",
	mcp.WithDescription("Add a comment to an issue"),
	mcp.WithString("issue_id", mcp.Required(), mcp.Description("Issue ID")),
	mcp.WithString("body", mcp.Required(), mcp.Description("Comment body text")),
)

func commentAddHandler(db *gorm.DB) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userID := userIDFromContext(ctx)
		iid, err := parseUint(req.GetString("issue_id", ""))
		if err != nil {
			return errorResult("invalid issue_id"), nil
		}
		body := req.GetString("body", "")
		if body == "" {
			return errorResult("body is required"), nil
		}

		comment := models.Comment{
			IssueID:  iid,
			AuthorID: userID,
			Body:     body,
		}
		if err := db.Create(&comment).Error; err != nil {
			return errorResult("failed to create comment: " + err.Error()), nil
		}
		return jsonResult(comment), nil
	}
}
