package api

import (
	"jifa/backend/config"
	"jifa/backend/internal/api/handlers"
	"jifa/backend/internal/api/middleware"
	"jifa/backend/internal/mcp"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func NewRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	if cfg.BasePath != "" {
		r.GET(cfg.BasePath, func(c *gin.Context) {
			c.Redirect(301, cfg.BasePath+"/")
		})
	}

	api := r.Group(cfg.BasePath + "/api/v1")

	// Auth (public)
	authHandler := handlers.NewAuthHandler(db, cfg)
	auth := api.Group("/auth")
	auth.POST("/register", authHandler.Register)
	auth.POST("/login", authHandler.Login)
	auth.POST("/refresh", authHandler.Refresh)

	pwResetHandler := handlers.NewPasswordResetHandler(db, cfg)
	api.POST("/auth/forgot-password", pwResetHandler.ForgotPassword)
	api.POST("/auth/reset-password", pwResetHandler.ResetPassword)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret), middleware.RateLimit())

	totpHandler := handlers.NewTotpHandler(db)
	protected.GET("/auth/totp/setup", totpHandler.Setup)
	protected.POST("/auth/totp/enable", totpHandler.Enable)
	protected.POST("/auth/totp/disable", totpHandler.Disable)

	userHandler := handlers.NewUserHandler(db)
	protected.GET("/users", userHandler.List)
	protected.GET("/me", userHandler.Me)
	protected.PUT("/me", userHandler.UpdateProfile)
	protected.PUT("/me/password", userHandler.ChangePassword)
	protected.GET("/me/preferences", userHandler.GetPreferences)
	protected.PUT("/me/preferences", userHandler.UpdatePreferences)

	projectHandler := handlers.NewProjectHandler(db)
	protected.GET("/projects", projectHandler.List)
	protected.POST("/projects", projectHandler.Create)

	// ------------------------------------------------------------------
	// Permission-based project routes.
	// ------------------------------------------------------------------
	project := protected.Group("/projects/:projectId").
		Use(middleware.LoadProjectPermissions(db), middleware.BlockIfArchived(db))

	// Basic project info (name, key, description) is available to any member
	// of the project. LoadProjectPermissions already enforces membership
	// (returns 404 otherwise), so no extra permission gate is needed here.
	project.GET("", projectHandler.Get)
	project.PUT("", middleware.RequirePermission("project.edit"), projectHandler.Update)
	// Archive/Unarchive bypass BlockIfArchived: archive transitions are the
	// only state change permitted on archived projects. They re-use the
	// project.edit permission.
	project.POST("/archive", middleware.RequirePermission("project.edit"), projectHandler.Archive)
	project.POST("/unarchive", middleware.RequirePermission("project.edit"), projectHandler.Unarchive)
	// Hard delete: owner-only with typed-name confirmation enforced in the
	// handler. Not gated by a permission — only the project owner can ever
	// destroy data.
	project.DELETE("", projectHandler.Delete)

	project.POST("/star", middleware.RequirePermission("project.view"), projectHandler.Star)
	project.DELETE("/star", middleware.RequirePermission("project.view"), projectHandler.Unstar)

	memberHandler := handlers.NewMemberHandler(db)
	project.GET("/members", middleware.RequirePermission("member.view"), memberHandler.List)
	project.POST("/members", middleware.RequirePermission("member.invite"), memberHandler.Add)
	project.PUT("/members/:memberId", middleware.RequirePermission("member.role-change"), memberHandler.UpdateRole)
	project.DELETE("/members/:memberId", middleware.RequirePermission("member.remove"), memberHandler.Remove)

	sprintHandler := handlers.NewSprintHandler(db)
	project.GET("/sprints", middleware.RequirePermission("project.view"), sprintHandler.List)
	project.POST("/sprints", middleware.RequirePermission("sprint.create"), sprintHandler.Create)
	project.PUT("/sprints/:sprintId", middleware.RequirePermission("sprint.edit"), sprintHandler.Update)
	project.POST("/sprints/:sprintId/start", middleware.RequirePermission("sprint.manage"), sprintHandler.Start)
	project.POST("/sprints/:sprintId/complete", middleware.RequirePermission("sprint.manage"), sprintHandler.Complete)

	reportHandler := handlers.NewReportHandler(db)
	project.GET("/reports/velocity", middleware.RequirePermission("project.view"), reportHandler.Velocity)
	project.GET("/reports/cycle-time", middleware.RequirePermission("project.view"), reportHandler.CycleTime)
	project.GET("/reports/workload", middleware.RequirePermission("project.view"), reportHandler.Workload)
	project.GET("/reports/cfd", middleware.RequirePermission("project.view"), reportHandler.CFD)
	project.GET("/reports/time-in-status", middleware.RequirePermission("project.view"), reportHandler.TimeInStatus)
	project.GET("/reports/control-chart", middleware.RequirePermission("project.view"), reportHandler.ControlChart)
	project.GET("/sprints/:sprintId/burndown", middleware.RequirePermission("project.view"), reportHandler.Burndown)
	project.GET("/sprints/:sprintId/retrospective", middleware.RequirePermission("project.view"), sprintHandler.Retrospective)

	csvHandler := handlers.NewCSVHandler(db)
	project.GET("/export/issues.csv", middleware.RequirePermission("project.view"), csvHandler.Export)
	project.POST("/import/issues", middleware.RequirePermission("issue.create"), csvHandler.Import)

	webhookHandler := handlers.NewWebhookHandler(db)
	project.GET("/webhooks", middleware.RequirePermission("webhook.manage"), webhookHandler.List)
	project.POST("/webhooks", middleware.RequirePermission("webhook.manage"), webhookHandler.Create)
	project.PUT("/webhooks/:webhookId", middleware.RequirePermission("webhook.manage"), webhookHandler.Update)
	project.DELETE("/webhooks/:webhookId", middleware.RequirePermission("webhook.manage"), webhookHandler.Delete)
	project.POST("/webhooks/:webhookId/test", middleware.RequirePermission("webhook.manage"), webhookHandler.Test)
	project.POST("/webhooks/test", middleware.RequirePermission("webhook.manage"), webhookHandler.TestDraft)

	statusHandler := handlers.NewStatusHandler(db)
	project.GET("/statuses", middleware.RequirePermission("project.view"), statusHandler.List)
	project.POST("/statuses", middleware.RequirePermission("workflow.edit"), statusHandler.Create)
	project.PUT("/statuses/:statusId", middleware.RequirePermission("workflow.edit"), statusHandler.Update)
	project.POST("/statuses/reorder", middleware.RequirePermission("workflow.edit"), statusHandler.Reorder)
	project.DELETE("/statuses/:statusId", middleware.RequirePermission("workflow.edit"), statusHandler.Delete)

	auditHandler := handlers.NewAuditHandler(db)
	project.GET("/audit", middleware.RequirePermission("audit.view"), auditHandler.List)
	project.GET("/audit/export", middleware.RequirePermission("audit.export"), auditHandler.ExportCSV)

	templateHandler := handlers.NewTemplateHandler(db)
	project.GET("/templates", middleware.RequirePermission("project.view"), templateHandler.List)
	project.POST("/templates", middleware.RequirePermission("issue.create"), templateHandler.Create)
	project.PUT("/templates/:templateId", middleware.RequirePermission("issue.edit"), templateHandler.Update)
	project.DELETE("/templates/:templateId", middleware.RequirePermission("issue.delete"), templateHandler.Delete)

	boardHandler := handlers.NewBoardHandler(db)
	project.GET("/boards", middleware.RequirePermission("project.view"), boardHandler.List)
	project.GET("/boards/:boardId", middleware.RequirePermission("project.view"), boardHandler.Get)
	project.POST("/boards", middleware.RequirePermission("board.create"), boardHandler.Create)
	project.PUT("/boards/:boardId", middleware.RequirePermission("board.edit"), boardHandler.Update)
	project.DELETE("/boards/:boardId", middleware.RequirePermission("board.delete"), boardHandler.Delete)

	// Components (also referenced from issue sub-routes below)
	componentHandler := handlers.NewComponentHandler(db)
	project.GET("/components", middleware.RequirePermission("project.view"), componentHandler.List)
	project.POST("/components", middleware.RequirePermission("component.create"), componentHandler.Create)
	// Reorder must precede /:componentId param route (Gin conflict, see versions).
	project.PUT("/components/reorder", middleware.RequirePermission("component.edit"), componentHandler.Reorder)
	project.PUT("/components/:componentId", middleware.RequirePermission("component.edit"), componentHandler.Update)
	project.DELETE("/components/:componentId", middleware.RequirePermission("component.delete"), componentHandler.Delete)

	versionHandler := handlers.NewVersionHandler(db)
	project.GET("/versions", middleware.RequirePermission("project.view"), versionHandler.List)
	project.POST("/versions", middleware.RequirePermission("version.create"), versionHandler.Create)
	// Reorder must be registered BEFORE the /:versionId param route, otherwise
	// Gin matches /versions/reorder against /:versionId (with versionId="reorder")
	// and dispatches Update → "version not found".
	project.PUT("/versions/reorder", middleware.RequirePermission("version.edit"), versionHandler.Reorder)
	project.PUT("/versions/:versionId", middleware.RequirePermission("version.edit"), versionHandler.Update)
	project.POST("/versions/:versionId/release", middleware.RequirePermission("version.release"), versionHandler.Release)
	project.POST("/versions/:versionId/unrelease", middleware.RequirePermission("version.release"), versionHandler.Unrelease)
	project.DELETE("/versions/:versionId", middleware.RequirePermission("version.delete"), versionHandler.Delete)

	// Labels (also referenced from issue sub-routes below)
	labelHandler := handlers.NewLabelHandler(db)
	project.GET("/labels", middleware.RequirePermission("project.view"), labelHandler.List)
	project.POST("/labels", middleware.RequirePermission("issue.edit"), labelHandler.Create)
	project.PUT("/labels/:labelId", middleware.RequirePermission("issue.edit"), labelHandler.Update)
	project.DELETE("/labels/:labelId", middleware.RequirePermission("issue.edit"), labelHandler.Delete)

	wikiHandler := handlers.NewWikiHandler(db)
	// Wiki visibility is per-page. List filters by author when the caller
	// lacks wiki.view; Get returns 404 instead of leaking page existence.
	// LoadProjectPermissions already enforces project membership.
	project.GET("/wiki", wikiHandler.List)
	project.POST("/wiki", middleware.RequirePermission("wiki.create"), wikiHandler.Create)
	project.GET("/wiki/:pageId", wikiHandler.Get)
	// Update/Delete: authors can always modify their own pages. The handlers
	// enforce wiki.edit / wiki.delete for non-authors.
	project.PUT("/wiki/:pageId", wikiHandler.Update)
	project.DELETE("/wiki/:pageId", wikiHandler.Delete)

	wikiCommentHandler := handlers.NewWikiCommentHandler(db)
	project.GET("/wiki/:pageId/comments", wikiCommentHandler.List)
	project.POST("/wiki/:pageId/comments", middleware.RequirePermission("wiki.comment"), wikiCommentHandler.Create)
	project.PUT("/wiki/:pageId/comments/:commentId", middleware.RequirePermission("wiki.comment"), wikiCommentHandler.Update)
	project.DELETE("/wiki/:pageId/comments/:commentId", middleware.RequirePermission("wiki.comment"), wikiCommentHandler.Delete)
	project.POST("/wiki/:pageId/watch", middleware.RequirePermission("wiki.view"), wikiCommentHandler.Watch)
	project.DELETE("/wiki/:pageId/watch", middleware.RequirePermission("wiki.view"), wikiCommentHandler.Unwatch)
	project.GET("/wiki/:pageId/watchers", middleware.RequirePermission("project.view"), wikiCommentHandler.ListWatchers)

	permissionHandler := handlers.NewPermissionHandler(db)
	project.GET("/permissions", middleware.RequirePermission("project.view"), permissionHandler.List)
	project.GET("/permissions/my", permissionHandler.MyPermissions)

	roleHandler := handlers.NewRoleHandler(db)
	project.GET("/roles", middleware.RequirePermission("member.view"), roleHandler.List)
	project.POST("/roles", middleware.RequirePermission("member.role-change"), roleHandler.Create)
	project.PUT("/roles/:roleId", middleware.RequirePermission("member.role-change"), roleHandler.Update)
	project.DELETE("/roles/:roleId", middleware.RequirePermission("member.role-change"), roleHandler.Delete)
	project.GET("/roles/:roleId/permissions", middleware.RequirePermission("member.role-change"), roleHandler.GetPermissions)
	project.PUT("/roles/:roleId/permissions", middleware.RequirePermission("member.role-change"), roleHandler.SetPermissions)

	// Issue routes (project resolved from the issue itself)
	issueHandler := handlers.NewIssueHandler(db)
	issues := protected.Group("/issues")

	issues.GET("", issueHandler.List)
	issues.POST("", issueHandler.Create)
	issues.POST("/bulk", issueHandler.Bulk)
	issues.GET("/:id", middleware.RequireIssuePermission(db, "issue.view"), issueHandler.Get)
	issues.PUT("/:id", middleware.RequireIssuePermission(db, "issue.edit"), issueHandler.Update)
	issues.DELETE("/:id", middleware.RequireIssuePermission(db, "issue.delete"), issueHandler.Delete)
	issues.POST("/:id/clone", middleware.RequireIssuePermission(db, "issue.create"), issueHandler.Clone)
	issues.POST("/:id/convert", middleware.RequireIssuePermission(db, "issue.edit"), issueHandler.Convert)
	issues.PUT("/:id/status", middleware.RequireIssuePermission(db, "issue.edit"), issueHandler.UpdateStatus)
	issues.PUT("/:id/rank", middleware.RequireIssuePermission(db, "issue.rank"), issueHandler.Rank)
	issues.POST("/:id/comments", middleware.RequireIssuePermission(db, "issue.comment"), issueHandler.AddComment)
	issues.PUT("/:id/comments/:commentId", middleware.RequireIssuePermission(db, "issue.comment"), issueHandler.UpdateComment)
	issues.DELETE("/:id/comments/:commentId", middleware.RequireIssuePermission(db, "issue.comment"), issueHandler.DeleteComment)
	issues.PUT("/:id/labels", middleware.RequireIssuePermission(db, "issue.edit"), labelHandler.SetIssueLabels)
	issues.PUT("/:id/components", middleware.RequireIssuePermission(db, "issue.edit"), componentHandler.SetIssueComponents)

	worklogHandler := handlers.NewWorklogHandler(db)
	issues.GET("/:id/worklog", middleware.RequireIssuePermission(db, "issue.view"), worklogHandler.List)
	issues.POST("/:id/worklog", middleware.RequireIssuePermission(db, "issue.worklog"), worklogHandler.Create)
	issues.PUT("/:id/worklog/:worklogId", middleware.RequireIssuePermission(db, "issue.worklog"), worklogHandler.Update)
	issues.DELETE("/:id/worklog/:worklogId", middleware.RequireIssuePermission(db, "issue.worklog"), worklogHandler.Delete)

	linkHandler := handlers.NewLinkHandler(db)
	issues.GET("/:id/links", middleware.RequireIssuePermission(db, "issue.view"), linkHandler.List)
	issues.POST("/:id/links", middleware.RequireIssuePermission(db, "issue.manage-link"), linkHandler.Create)
	issues.DELETE("/:id/links/:linkId", middleware.RequireIssuePermission(db, "issue.manage-link"), linkHandler.Delete)

	watcherHandler := handlers.NewWatcherHandler(db)
	issues.GET("/:id/watchers", middleware.RequireIssuePermission(db, "issue.view"), watcherHandler.List)
	issues.POST("/:id/watch", middleware.RequireIssuePermission(db, "issue.view"), watcherHandler.Watch)
	issues.DELETE("/:id/watch", middleware.RequireIssuePermission(db, "issue.view"), watcherHandler.Unwatch)

	activityHandler := handlers.NewActivityHandler(db)
	issues.GET("/:id/activity", middleware.RequireIssuePermission(db, "issue.view"), activityHandler.List)

	attachHandler := handlers.NewAttachmentHandler(db, cfg)
	issues.GET("/:id/attachments", middleware.RequireIssuePermission(db, "issue.view"), attachHandler.List)
	issues.POST("/:id/attachments", middleware.RequireIssuePermission(db, "issue.manage-attachment"), attachHandler.Upload)
	issues.GET("/:id/attachments/:attachmentId", middleware.RequireIssuePermission(db, "issue.view"), attachHandler.Download)
	issues.DELETE("/:id/attachments/:attachmentId", middleware.RequireIssuePermission(db, "issue.manage-attachment"), attachHandler.Delete)

	// Notifications
	notifHandler := handlers.NewNotificationHandler(db)
	protected.GET("/notifications", notifHandler.List)
	protected.GET("/notifications/unread-count", notifHandler.UnreadCount)
	protected.PUT("/notifications/:id/read", notifHandler.MarkRead)
	protected.POST("/notifications/read-all", notifHandler.MarkAllRead)
	protected.GET("/notifications/preferences", notifHandler.GetPrefs)
	protected.PUT("/notifications/preferences", notifHandler.UpdatePrefs)

	searchHandler := handlers.NewSearchHandler(db)
	protected.GET("/search", searchHandler.Search)
	protected.GET("/jql", searchHandler.JQL)

	recentHandler := handlers.NewRecentHandler(db)
	protected.GET("/me/recent", recentHandler.List)

	// Personal Access Tokens
	tokenHandler := handlers.NewTokenHandler(db)
	protected.GET("/tokens", tokenHandler.List)
	protected.POST("/tokens", tokenHandler.Create)
	protected.DELETE("/tokens/:id", tokenHandler.Delete)

	// MCP (Model Context Protocol) — SSE-based, dual auth (JWT or PAT)
	if cfg.MCPEnabled {
		mcpBasePath := cfg.BasePath + "/api/v1" + cfg.MCPPath
		sseServer := mcp.NewSSEServer(db, mcpBasePath)
		mcpGroup := api.Group(cfg.MCPPath)
		mcpGroup.Use(middleware.MCPAuth(db, cfg))
		mcpGroup.Any("", mcp.GinHandler(sseServer))
		mcpGroup.Any("/*path", mcp.GinHandler(sseServer))
	}

	filterHandler := handlers.NewFilterHandler(db)
	protected.GET("/filters", filterHandler.List)
	protected.POST("/filters", filterHandler.Create)
	protected.PUT("/filters/:id", filterHandler.Update)
	protected.DELETE("/filters/:id", filterHandler.Delete)

	return r
}
