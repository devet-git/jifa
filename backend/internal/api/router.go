package api

import (
	"jifa/backend/config"
	"jifa/backend/internal/api/handlers"
	"jifa/backend/internal/api/middleware"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func NewRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	// Redirect BasePath root (e.g. "/jifa") to the app
	if cfg.BasePath != "" {
		r.GET(cfg.BasePath, func(c *gin.Context) {
			c.Redirect(301, cfg.BasePath+"/")
		})
	}

	api := r.Group(cfg.BasePath + "/api/v1")

	// Auth (public)
	authHandler := handlers.NewAuthHandler(db, cfg)
	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
	}

	// Password reset (public — no auth token required)
	pwResetHandler := handlers.NewPasswordResetHandler(db, cfg)
	api.POST("/auth/forgot-password", pwResetHandler.ForgotPassword)
	api.POST("/auth/reset-password", pwResetHandler.ResetPassword)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret), middleware.RateLimit())
	{
		// TOTP / 2FA
		totpHandler := handlers.NewTotpHandler(db)
		protected.GET("/auth/totp/setup", totpHandler.Setup)
		protected.POST("/auth/totp/enable", totpHandler.Enable)
		protected.POST("/auth/totp/disable", totpHandler.Disable)

		// User (self)
		userHandler := handlers.NewUserHandler(db)
		protected.GET("/users", userHandler.List)
		protected.GET("/me", userHandler.Me)
		protected.PUT("/me", userHandler.UpdateProfile)

		// Project list/create (no membership context yet)
		projectHandler := handlers.NewProjectHandler(db)
		protected.GET("/projects", projectHandler.List)
		protected.POST("/projects", projectHandler.Create)

		// Per-project routes — gated by role.
		viewer := protected.Group("/projects/:projectId").
			Use(middleware.RequireProjectRole(db, "projectId", models.RoleViewer))
		member := protected.Group("/projects/:projectId").
			Use(middleware.RequireProjectRole(db, "projectId", models.RoleMember))
		admin := protected.Group("/projects/:projectId").
			Use(middleware.RequireProjectRole(db, "projectId", models.RoleAdmin))

		viewer.GET("", projectHandler.Get)
		admin.PUT("", projectHandler.Update)
		admin.DELETE("", projectHandler.Delete)

		// Per-user project star (viewers can star anything they can see)
		viewer.POST("/star", projectHandler.Star)
		viewer.DELETE("/star", projectHandler.Unstar)

		// Members (admin manages, viewers can read the list)
		memberHandler := handlers.NewMemberHandler(db)
		viewer.GET("/members", memberHandler.List)
		admin.POST("/members", memberHandler.Add)
		admin.PUT("/members/:memberId", memberHandler.UpdateRole)
		admin.DELETE("/members/:memberId", memberHandler.Remove)

		// Sprints
		sprintHandler := handlers.NewSprintHandler(db)
		viewer.GET("/sprints", sprintHandler.List)
		member.POST("/sprints", sprintHandler.Create)
		member.PUT("/sprints/:sprintId", sprintHandler.Update)
		member.POST("/sprints/:sprintId/start", sprintHandler.Start)
		member.POST("/sprints/:sprintId/complete", sprintHandler.Complete)

		// Reports
		reportHandler := handlers.NewReportHandler(db)
		viewer.GET("/reports/velocity", reportHandler.Velocity)
		viewer.GET("/reports/cycle-time", reportHandler.CycleTime)
		viewer.GET("/reports/workload", reportHandler.Workload)
		viewer.GET("/reports/cfd", reportHandler.CFD)
		viewer.GET("/reports/time-in-status", reportHandler.TimeInStatus)
		viewer.GET("/reports/control-chart", reportHandler.ControlChart)
		viewer.GET("/sprints/:sprintId/burndown", reportHandler.Burndown)
		viewer.GET("/sprints/:sprintId/retrospective", sprintHandler.Retrospective)

		// CSV import / export
		csvHandler := handlers.NewCSVHandler(db)
		viewer.GET("/export/issues.csv", csvHandler.Export)
		member.POST("/import/issues", csvHandler.Import)

		// Webhooks (admin-only)
		webhookHandler := handlers.NewWebhookHandler(db)
		admin.GET("/webhooks", webhookHandler.List)
		admin.POST("/webhooks", webhookHandler.Create)
		admin.PUT("/webhooks/:webhookId", webhookHandler.Update)
		admin.DELETE("/webhooks/:webhookId", webhookHandler.Delete)

		// Statuses (custom workflow)
		statusHandler := handlers.NewStatusHandler(db)
		viewer.GET("/statuses", statusHandler.List)
		admin.POST("/statuses", statusHandler.Create)
		admin.PUT("/statuses/:statusId", statusHandler.Update)
		admin.POST("/statuses/reorder", statusHandler.Reorder)
		admin.DELETE("/statuses/:statusId", statusHandler.Delete)

		// Audit log
		auditHandler := handlers.NewAuditHandler(db)
		admin.GET("/audit", auditHandler.List)
		admin.GET("/audit/export", auditHandler.ExportCSV)

		// Issue templates
		templateHandler := handlers.NewTemplateHandler(db)
		viewer.GET("/templates", templateHandler.List)
		member.POST("/templates", templateHandler.Create)
		member.PUT("/templates/:templateId", templateHandler.Update)
		member.DELETE("/templates/:templateId", templateHandler.Delete)

		// Boards (multi-board Kanban views)
		boardHandler := handlers.NewBoardHandler(db)
		viewer.GET("/boards", boardHandler.List)
		viewer.GET("/boards/:boardId", boardHandler.Get)
		member.POST("/boards", boardHandler.Create)
		member.PUT("/boards/:boardId", boardHandler.Update)
		admin.DELETE("/boards/:boardId", boardHandler.Delete)

		// Components (project-scoped routes; issue-scoped route registered
		// below once the `issues` group exists)
		componentHandler := handlers.NewComponentHandler(db)
		viewer.GET("/components", componentHandler.List)
		member.POST("/components", componentHandler.Create)
		member.PUT("/components/:componentId", componentHandler.Update)
		member.PUT("/components/reorder", componentHandler.Reorder)
		admin.DELETE("/components/:componentId", componentHandler.Delete)

		// Versions (releases)
		versionHandler := handlers.NewVersionHandler(db)
		viewer.GET("/versions", versionHandler.List)
		member.POST("/versions", versionHandler.Create)
		member.PUT("/versions/:versionId", versionHandler.Update)
		member.PUT("/versions/reorder", versionHandler.Reorder)
		member.POST("/versions/:versionId/release", versionHandler.Release)
		member.POST("/versions/:versionId/unrelease", versionHandler.Unrelease)
		admin.DELETE("/versions/:versionId", versionHandler.Delete)

		// Labels
		labelHandler := handlers.NewLabelHandler(db)
		viewer.GET("/labels", labelHandler.List)
		member.POST("/labels", labelHandler.Create)
		member.DELETE("/labels/:labelId", labelHandler.Delete)

		// Issues (top-level list + resource routes gated via issue lookup)
		issueHandler := handlers.NewIssueHandler(db)
		issues := protected.Group("/issues")
		issues.GET("", issueHandler.List)
		issues.POST("", issueHandler.Create)
		issues.POST("/bulk", issueHandler.Bulk)
		issues.GET("/:id", middleware.RequireIssueRole(db, "id", models.RoleViewer), issueHandler.Get)
		issues.PUT("/:id", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.Update)
		issues.DELETE("/:id", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.Delete)
		issues.POST("/:id/clone", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.Clone)
		issues.POST("/:id/convert", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.Convert)
		issues.PUT("/:id/status", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.UpdateStatus)
		issues.PUT("/:id/rank", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.Rank)
		issues.POST("/:id/comments", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.AddComment)
		issues.PUT("/:id/comments/:commentId", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.UpdateComment)
		issues.DELETE("/:id/comments/:commentId", middleware.RequireIssueRole(db, "id", models.RoleMember), issueHandler.DeleteComment)
		issues.PUT("/:id/labels", middleware.RequireIssueRole(db, "id", models.RoleMember), labelHandler.SetIssueLabels)
		issues.PUT("/:id/components", middleware.RequireIssueRole(db, "id", models.RoleMember), componentHandler.SetIssueComponents)

		// Worklog
		worklogHandler := handlers.NewWorklogHandler(db)
		issues.GET("/:id/worklog", middleware.RequireIssueRole(db, "id", models.RoleViewer), worklogHandler.List)
		issues.POST("/:id/worklog", middleware.RequireIssueRole(db, "id", models.RoleMember), worklogHandler.Create)
		issues.PUT("/:id/worklog/:worklogId", middleware.RequireIssueRole(db, "id", models.RoleMember), worklogHandler.Update)
		issues.DELETE("/:id/worklog/:worklogId", middleware.RequireIssueRole(db, "id", models.RoleMember), worklogHandler.Delete)

		// Issue links, watchers, activity (sub-resources of an issue)
		linkHandler := handlers.NewLinkHandler(db)
		issues.GET("/:id/links", middleware.RequireIssueRole(db, "id", models.RoleViewer), linkHandler.List)
		issues.POST("/:id/links", middleware.RequireIssueRole(db, "id", models.RoleMember), linkHandler.Create)
		issues.DELETE("/:id/links/:linkId", middleware.RequireIssueRole(db, "id", models.RoleMember), linkHandler.Delete)

		watcherHandler := handlers.NewWatcherHandler(db)
		issues.GET("/:id/watchers", middleware.RequireIssueRole(db, "id", models.RoleViewer), watcherHandler.List)
		issues.POST("/:id/watch", middleware.RequireIssueRole(db, "id", models.RoleViewer), watcherHandler.Watch)
		issues.DELETE("/:id/watch", middleware.RequireIssueRole(db, "id", models.RoleViewer), watcherHandler.Unwatch)

		activityHandler := handlers.NewActivityHandler(db)
		issues.GET("/:id/activity", middleware.RequireIssueRole(db, "id", models.RoleViewer), activityHandler.List)

		// Attachments
		attachHandler := handlers.NewAttachmentHandler(db, cfg)
		issues.GET("/:id/attachments", middleware.RequireIssueRole(db, "id", models.RoleViewer), attachHandler.List)
		issues.POST("/:id/attachments", middleware.RequireIssueRole(db, "id", models.RoleMember), attachHandler.Upload)
		issues.GET("/:id/attachments/:attachmentId", middleware.RequireIssueRole(db, "id", models.RoleViewer), attachHandler.Download)
		issues.DELETE("/:id/attachments/:attachmentId", middleware.RequireIssueRole(db, "id", models.RoleMember), attachHandler.Delete)

		// Notifications (always scoped to the requesting user)
		notifHandler := handlers.NewNotificationHandler(db)
		protected.GET("/notifications", notifHandler.List)
		protected.GET("/notifications/unread-count", notifHandler.UnreadCount)
		protected.PUT("/notifications/:id/read", notifHandler.MarkRead)
		protected.POST("/notifications/read-all", notifHandler.MarkAllRead)
		protected.GET("/notifications/preferences", notifHandler.GetPrefs)
		protected.PUT("/notifications/preferences", notifHandler.UpdatePrefs)

		// Global search
		searchHandler := handlers.NewSearchHandler(db)
		protected.GET("/search", searchHandler.Search)
		protected.GET("/jql", searchHandler.JQL)

		// Recently viewed
		recentHandler := handlers.NewRecentHandler(db)
		protected.GET("/me/recent", recentHandler.List)

		// Wiki pages (project-scoped)
		wikiHandler := handlers.NewWikiHandler(db)
		viewer.GET("/wiki", wikiHandler.List)
		member.POST("/wiki", wikiHandler.Create)
		viewer.GET("/wiki/:pageId", wikiHandler.Get)
		member.PUT("/wiki/:pageId", wikiHandler.Update)
		member.DELETE("/wiki/:pageId", wikiHandler.Delete)

		// Saved filters
		filterHandler := handlers.NewFilterHandler(db)
		protected.GET("/filters", filterHandler.List)
		protected.POST("/filters", filterHandler.Create)
		protected.PUT("/filters/:id", filterHandler.Update)
		protected.DELETE("/filters/:id", filterHandler.Delete)
	}

	return r
}
