package models

type PermissionDef struct {
	Key         string
	Name        string
	Group       string
	Description string
}

type RoleDef struct {
	Name        string
	IsSystem    bool
	Permissions []string // permission keys
}

var AllPermissions = []PermissionDef{
	{Key: "project.view", Name: "View Project", Group: "project", Description: "Browse the project and view its details"},
	{Key: "project.edit", Name: "Edit Project", Group: "project", Description: "Update project name, description, settings, and archive state"},

	{Key: "issue.view", Name: "View Issues", Group: "issue", Description: "View issue details and lists"},
	{Key: "issue.create", Name: "Create Issues", Group: "issue", Description: "Create new issues in the project"},
	{Key: "issue.edit", Name: "Edit Issues", Group: "issue", Description: "Edit issue fields such as title, description, priority, and story points"},
	{Key: "issue.delete", Name: "Delete Issues", Group: "issue", Description: "Delete issues"},
	{Key: "issue.assign", Name: "Assign Issues", Group: "issue", Description: "Assign issues to users"},
	{Key: "issue.comment", Name: "Comment on Issues", Group: "issue", Description: "Add, edit, and delete comments on issues"},
	{Key: "issue.rank", Name: "Rank Issues", Group: "issue", Description: "Reorder issues on backlog and board"},
	{Key: "issue.worklog", Name: "Log Work", Group: "issue", Description: "Log time on issues"},
	{Key: "issue.manage-attachment", Name: "Manage Attachments", Group: "issue", Description: "Upload and delete attachments"},
	{Key: "issue.manage-link", Name: "Manage Issue Links", Group: "issue", Description: "Add and remove issue links"},

	{Key: "sprint.create", Name: "Create Sprints", Group: "sprint", Description: "Create new sprints"},
	{Key: "sprint.edit", Name: "Edit Sprints", Group: "sprint", Description: "Edit sprint name, goal, and dates"},
	{Key: "sprint.delete", Name: "Delete Sprints", Group: "sprint", Description: "Delete sprints"},
	{Key: "sprint.manage", Name: "Manage Sprints", Group: "sprint", Description: "Start and complete sprints"},

	{Key: "version.create", Name: "Create Versions", Group: "version", Description: "Create new versions"},
	{Key: "version.edit", Name: "Edit Versions", Group: "version", Description: "Edit version details"},
	{Key: "version.delete", Name: "Delete Versions", Group: "version", Description: "Delete versions"},
	{Key: "version.release", Name: "Release Versions", Group: "version", Description: "Release and archive versions"},

	{Key: "board.create", Name: "Create Boards", Group: "board", Description: "Create new boards"},
	{Key: "board.edit", Name: "Edit Boards", Group: "board", Description: "Edit board configuration"},
	{Key: "board.delete", Name: "Delete Boards", Group: "board", Description: "Delete boards"},

	{Key: "wiki.view",    Name: "View All Wiki Pages",    Group: "wiki", Description: "View wiki pages authored by other members. Without this, a user only sees pages they created themselves."},
	{Key: "wiki.create",  Name: "Create Wiki Pages",      Group: "wiki", Description: "Create new wiki pages"},
	{Key: "wiki.edit",    Name: "Edit Wiki Pages",        Group: "wiki", Description: "Edit wiki pages authored by other members (authors can always edit their own pages)"},
	{Key: "wiki.delete",  Name: "Delete Wiki Pages",      Group: "wiki", Description: "Delete wiki pages authored by other members (authors can always delete their own pages)"},
	{Key: "wiki.comment", Name: "Comment on Wiki Pages",  Group: "wiki", Description: "Add, edit, and delete comments on wiki pages"},

	{Key: "component.create", Name: "Create Components", Group: "component", Description: "Create new components"},
	{Key: "component.edit", Name: "Edit Components", Group: "component", Description: "Edit component details"},
	{Key: "component.delete", Name: "Delete Components", Group: "component", Description: "Delete components"},

	{Key: "member.view", Name: "View Members", Group: "member", Description: "View the member list"},
	{Key: "member.invite", Name: "Invite Members", Group: "member", Description: "Add new members to the project"},
	{Key: "member.role-change", Name: "Change Member Roles", Group: "member", Description: "Change role assignments"},
	{Key: "member.remove", Name: "Remove Members", Group: "member", Description: "Remove members from the project"},

	{Key: "workflow.edit", Name: "Edit Workflow", Group: "workflow", Description: "Create, edit, and reorder statuses"},

	{Key: "webhook.manage", Name: "Manage Webhooks", Group: "webhook", Description: "Create, edit, and delete webhooks"},

	{Key: "audit.view", Name: "View Audit Log", Group: "audit", Description: "View the audit log"},
	{Key: "audit.export", Name: "Export Audit Log", Group: "audit", Description: "Export the audit log to CSV"},
}

// SystemRoles defines the three built-in roles with their permission keys.
// Admin gets all permissions; Member and Viewer get appropriate subsets.
func SystemRoles() []RoleDef {
	var allKeys []string
	for _, p := range AllPermissions {
		allKeys = append(allKeys, p.Key)
	}

	return []RoleDef{
		{
			Name:        "Admin",
			IsSystem:    true,
			Permissions: allKeys,
		},
		{
			Name:     "Member",
			IsSystem: true,
			Permissions: []string{
				"project.view",
				"issue.view", "issue.create", "issue.edit", "issue.delete",
				"issue.assign", "issue.comment", "issue.rank", "issue.worklog",
				"issue.manage-attachment", "issue.manage-link",
				"sprint.create", "sprint.edit", "sprint.manage",
				"version.create", "version.edit", "version.release",
				"board.create", "board.edit",
				"wiki.view", "wiki.create", "wiki.edit", "wiki.delete", "wiki.comment",
				"component.create", "component.edit",
				"member.view",
			},
		},
		{
			Name:     "Viewer",
			IsSystem: true,
			Permissions: []string{
				"project.view",
				"issue.view",
				"member.view",
				"wiki.view",
			},
		},
	}
}
