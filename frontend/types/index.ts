export type IssueType = "task" | "bug" | "story" | "epic" | "subtask";
export type IssuePriority = "low" | "medium" | "high" | "urgent";
export type IssueStatus = "todo" | "in_progress" | "in_review" | "done";
export type SprintStatus = "planned" | "active" | "completed";
export type ProjectRole = "admin" | "member" | "viewer";

export interface Permission {
  id: number;
  key: string;
  name: string;
  group: string;
  description: string;
}

export interface Role {
  id: number;
  project_id: number | null;
  name: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  totp_enabled?: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  key: string;
  description?: string;
  owner_id: number;
  owner?: User;
  is_starred?: boolean;
  date_format: string;
  time_format: string;
  category?: string;
  archived_at?: string | null;
  created_at: string;
}

export interface Sprint {
  id: number;
  name: string;
  goal?: string;
  status: SprintStatus;
  start_date?: string;
  end_date?: string;
  project_id: number;
  issues?: Issue[];
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Comment {
  id: number;
  body: string;
  author_id: number;
  author: User;
  created_at: string;
}

export type IssueLinkType = "blocks" | "relates" | "duplicates";

export interface IssueLink {
  id: number;
  type: IssueLinkType;
  source_id: number;
  target_id: number;
  source?: Issue;
  target?: Issue;
  created_at: string;
}

export interface IssueWatcher {
  id: number;
  issue_id: number;
  user_id: number;
  user?: User;
  created_at: string;
}

export type NotificationType =
  | "comment"
  | "mention"
  | "assigned"
  | "status_change"
  | "link_added";

export interface NotificationPrefs {
  in_app_comment: boolean;
  in_app_mention: boolean;
  in_app_assigned: boolean;
  in_app_status_change: boolean;
  in_app_link_added: boolean;
  email_comment: boolean;
  email_mention: boolean;
  email_assigned: boolean;
  email_status_change: boolean;
  email_link_added: boolean;
  email_digest: boolean;
}

export interface Notification {
  id: number;
  user_id: number;
  actor_id?: number;
  actor?: User;
  type: NotificationType;
  issue_id?: number;
  issue?: Issue;
  comment_id?: number;
  body: string;
  read_at?: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  project_id: number;
  actor_id: number;
  actor?: User;
  action: string;
  target_type: string;
  target_id: number;
  details: string;
  created_at: string;
}

export interface Board {
  id: number;
  project_id: number;
  name: string;
  filter: string; // JSON-encoded BacklogFilterState
  created_at: string;
}

export type StatusCategory = "todo" | "in_progress" | "done";

export interface StatusDefinition {
  id: number;
  project_id: number;
  key: string;
  name: string;
  category: StatusCategory;
  color?: string;
  order_idx: number;
  created_at: string;
}

export type WebhookEvent =
  // Issue
  | "issue.created"
  | "issue.updated"
  | "issue.deleted"
  | "issue.status_changed"
  | "issue.assigned"
  | "issue.unassigned"
  | "issue.priority_changed"
  | "issue.linked"
  | "issue.unlinked"
  // Comment
  | "comment.created"
  | "comment.updated"
  | "comment.deleted"
  | "comment.mentioned"
  // Sprint
  | "sprint.created"
  | "sprint.updated"
  | "sprint.started"
  | "sprint.completed"
  // Version
  | "version.created"
  | "version.released"
  // Member
  | "member.added"
  | "member.removed"
  | "member.role_changed"
  // Worklog
  | "worklog.added"
  | "worklog.deleted"
  // Attachment
  | "attachment.uploaded"
  // Wiki
  | "wiki_page.created"
  | "wiki_page.updated"
  | "wiki_page.deleted"
  // Project
  | "project.updated";

export type WebhookMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD";

export type WebhookAuthType = "none" | "basic" | "bearer" | "header";
export type WebhookBodyType = "template" | "form";

export interface Webhook {
  id: number;
  project_id: number;
  name: string;
  url: string;
  active: boolean;
  events: string;
  events_list: WebhookEvent[];
  secret?: string; // returned only on create
  created_at: string;
  method: WebhookMethod;
  content_type: string;
  headers: string; // raw JSON string from backend
  headers_map: Record<string, string>;
  query_params: string; // raw JSON string from backend
  query_params_map: Record<string, string>;
  auth_type: WebhookAuthType;
  body_type: WebhookBodyType;
  body_template: string;
  form_fields: string;
  form_fields_map: Record<string, string>;
}

export interface WebhookTestResult {
  method: string;
  url: string;
  status_code: number;
  response_headers: Record<string, string>;
  response_body: string;
  error?: string;
  sent_body: string;
}

export interface Worklog {
  id: number;
  issue_id: number;
  user_id: number;
  user?: User;
  minutes: number;
  started_at: string;
  description?: string;
  created_at: string;
}

export interface Component {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  lead_id?: number;
  lead?: User;
  created_at: string;
}

export interface SavedFilter {
  id: number;
  user_id: number;
  project_id?: number;
  name: string;
  query: string; // JSON-encoded BacklogFilterState
  created_at: string;
}

export interface BacklogFilterState {
  q?: string;
  assignee_ids?: number[];
  types?: IssueType[];
  priorities?: IssuePriority[];
  label_ids?: number[];
  jql?: string;
}

export interface IssueTemplate {
  id: number;
  project_id: number;
  name: string;
  issue_type: IssueType;
  title: string;
  description: string;
  priority: IssuePriority;
  story_points?: number;
  created_at: string;
}

export interface Attachment {
  id: number;
  issue_id: number;
  uploader_id: number;
  uploader?: User;
  original_filename: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export type VersionStatus = "unreleased" | "released" | "archived";

export interface Version {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  status: VersionStatus;
  release_date?: string;
  released_at?: string;
  issue_count?: number;
  completed_count?: number;
  created_at: string;
}

export interface SearchResults {
  issues: Issue[];
  projects: Project[];
}

export interface IssueActivityEntry {
  id: number;
  issue_id: number;
  user_id: number;
  user?: User;
  field: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface Member {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectRole;
  role_id: number;
  role_model?: Role;
  user?: User;
  created_at: string;
}

export interface Issue {
  id: number;
  key?: string;
  number?: number;
  rank?: number;
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  story_points?: number;
  start_date?: string;
  due_date?: string;
  color?: string;
  project_id: number;
  sprint_id?: number;
  version_id?: number;
  version?: Version;
  assignee_id?: number | null;
  assignee?: User;
  reporter: User;
  parent_id?: number;
  sub_issues?: Issue[];
  comments?: Comment[];
  labels?: Label[];
  components?: Component[];
  original_estimate?: number; // minutes
  time_spent?: number; // minutes
  created_at: string;
}

export interface ActivityLog {
  id: number;
  issue_id: number;
  user: User;
  field: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface ApiToken {
  id: number;
  name: string;
  last_chars: string;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  token?: string; // returned only on create
}

export interface AppearancePreferences {
  font_size: "small" | "medium" | "large" | "xl";
  font_family: "geist" | "inter" | "roboto" | "manrope";
  accent_color: "indigo" | "blue" | "green" | "orange" | "purple" | "red" | "pink" | "teal";
}

export interface WikiPage {
  id: number;
  project_id: number;
  title: string;
  content?: string;
  author?: User;
  author_id: number;
  created_at: string;
  updated_at: string;
}

