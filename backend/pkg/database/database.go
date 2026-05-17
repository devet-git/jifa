package database

import (
	"errors"
	"log"

	"jifa/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(dsn string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Member{},
		&models.Sprint{},
		&models.Issue{},
		&models.Comment{},
		&models.Label{},
		&models.IssueLink{},
		&models.IssueWatcher{},
		&models.IssueActivity{},
		&models.Notification{},
		&models.Version{},
		&models.Attachment{},
		&models.SavedFilter{},
		&models.Component{},
		&models.Worklog{},
		&models.Webhook{},
		&models.StatusDefinition{},
		&models.Board{},
		&models.NotificationPref{},
		&models.AuditLog{},
		&models.RecentView{},
		&models.ProjectStar{},
		&models.IssueTemplate{},
		&models.PasswordResetToken{},
		&models.Permission{},
		&models.Role{},
		&models.RolePermission{},
		&models.WikiPage{},
		&models.WikiComment{},
		&models.WikiWatcher{},
		&models.PersonalAccessToken{},
		&models.UserAppearance{},
		&models.GitLabIntegration{},
		&models.IssueExternalRef{},
	)
}

// SeedPermissionsAndRoles creates the permission catalog and the three system
// roles (Admin / Member / Viewer).  Safe to call on every boot — skips
// everything if permissions already exist.
func SeedPermissionsAndRoles(db *gorm.DB) error {
	var n int64
	db.Model(&models.Permission{}).Count(&n)
	if n > 0 {
		return nil
	}

	// Seed permissions
	for _, p := range models.AllPermissions {
		db.Create(&models.Permission{
			Key:         p.Key,
			Name:        p.Name,
			Group:       p.Group,
			Description: p.Description,
		})
	}

	// Build key→id lookup
	var perms []models.Permission
	db.Find(&perms)
	keyToID := make(map[string]uint, len(perms))
	for _, p := range perms {
		keyToID[p.Key] = p.ID
	}

	// Seed system roles
	for _, rd := range models.SystemRoles() {
		role := models.Role{Name: rd.Name, IsSystem: true}
		db.Create(&role)

		for _, key := range rd.Permissions {
			if id, ok := keyToID[key]; ok {
				db.Create(&models.RolePermission{
					RoleID:       role.ID,
					PermissionID: id,
				})
			}
		}
	}

	return nil
}

// SyncPermissionCatalog upserts every permission defined in models.AllPermissions
// and grants any newly-introduced permission to the matching system roles so
// roles stay in sync with the code-defined catalog. Idempotent — safe on every
// boot. Existing role↔permission grants are never revoked here; an admin must
// remove permissions explicitly via the UI.
func SyncPermissionCatalog(db *gorm.DB) error {
	// 1. Upsert permissions from the source-of-truth catalog.
	created := 0
	for _, p := range models.AllPermissions {
		var existing models.Permission
		err := db.Where("key = ?", p.Key).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&models.Permission{
				Key:         p.Key,
				Name:        p.Name,
				Group:       p.Group,
				Description: p.Description,
			}).Error; err != nil {
				return err
			}
			created++
			log.Printf("[permission-sync] created permission %q", p.Key)
			continue
		}
		if err != nil {
			return err
		}
		// Refresh display metadata in case wording changed.
		db.Model(&existing).Updates(map[string]any{
			"name":        p.Name,
			"group":       p.Group,
			"description": p.Description,
		})
	}
	if created == 0 {
		log.Printf("[permission-sync] catalog is up to date (%d permissions)", len(models.AllPermissions))
	} else {
		log.Printf("[permission-sync] added %d new permission(s) to catalog", created)
	}

	// 2. Build key→id lookup for everything currently in the DB.
	var perms []models.Permission
	if err := db.Find(&perms).Error; err != nil {
		return err
	}
	keyToID := make(map[string]uint, len(perms))
	for _, p := range perms {
		keyToID[p.Key] = p.ID
	}

	// 3. For each system role, additively grant any permission listed in the
	//    role definition that the role does not yet have. Custom roles and
	//    admin-revoked permissions are left untouched.
	for _, rd := range models.SystemRoles() {
		var role models.Role
		if err := db.Where("is_system = true AND LOWER(name) = LOWER(?)", rd.Name).
			First(&role).Error; err != nil {
			// Role missing: SeedPermissionsAndRoles handles fresh installs.
			continue
		}
		var have []uint
		db.Model(&models.RolePermission{}).
			Where("role_id = ?", role.ID).
			Pluck("permission_id", &have)
		haveSet := make(map[uint]bool, len(have))
		for _, id := range have {
			haveSet[id] = true
		}
		grantedNew := 0
		for _, key := range rd.Permissions {
			id, ok := keyToID[key]
			if !ok || haveSet[id] {
				continue
			}
			if err := db.Create(&models.RolePermission{
				RoleID:       role.ID,
				PermissionID: id,
			}).Error; err != nil {
				log.Printf("[permission-sync] grant %q to role %q failed: %v", key, rd.Name, err)
				continue
			}
			grantedNew++
		}
		if grantedNew > 0 {
			log.Printf("[permission-sync] granted %d new permission(s) to system role %q", grantedNew, rd.Name)
		}
	}

	// 4. Remove permission rows that no longer exist in the source-of-truth
	//    catalog, plus any role grants referencing them. This is the only
	//    destructive step in the sync — required so revoking a permission
	//    from code cleans up DB without manual intervention.
	wanted := make(map[string]bool, len(models.AllPermissions))
	for _, p := range models.AllPermissions {
		wanted[p.Key] = true
	}
	for _, p := range perms {
		if wanted[p.Key] {
			continue
		}
		if err := db.Where("permission_id = ?", p.ID).
			Delete(&models.RolePermission{}).Error; err != nil {
			log.Printf("[permission-sync] cleanup role_permissions for %q failed: %v", p.Key, err)
			continue
		}
		if err := db.Delete(&models.Permission{}, p.ID).Error; err != nil {
			log.Printf("[permission-sync] cleanup permission %q failed: %v", p.Key, err)
			continue
		}
		log.Printf("[permission-sync] removed obsolete permission %q", p.Key)
	}
	return nil
}

// BackfillWebhookDefaults sets sensible defaults on webhook rows that pre-date
// the n8n-style fields (method, headers, body template, etc). Safe to call on
// every boot.
func BackfillWebhookDefaults(db *gorm.DB) error {
	// Body template is required going forward — backfill the legacy payload
	// shape so existing webhooks keep working unchanged.
	if err := db.Model(&models.Webhook{}).
		Where("body_template = '' OR body_template IS NULL").
		Update("body_template", models.DefaultBodyTemplate).Error; err != nil {
		return err
	}
	if err := db.Model(&models.Webhook{}).
		Where("method = '' OR method IS NULL").
		Update("method", "POST").Error; err != nil {
		return err
	}
	if err := db.Model(&models.Webhook{}).
		Where("content_type = '' OR content_type IS NULL").
		Update("content_type", "application/json").Error; err != nil {
		return err
	}
	if err := db.Model(&models.Webhook{}).
		Where("auth_type = '' OR auth_type IS NULL").
		Update("auth_type", models.AuthNone).Error; err != nil {
		return err
	}
	if err := db.Model(&models.Webhook{}).
		Where("body_type = '' OR body_type IS NULL").
		Update("body_type", "template").Error; err != nil {
		return err
	}
	return nil
}

// SeedStatuses backfills the default status set for any project that has no
// StatusDefinitions yet. Safe to call on every boot.
func SeedStatuses(db *gorm.DB) error {
	var projects []models.Project
	if err := db.Select("id").Find(&projects).Error; err != nil {
		return err
	}
	for _, p := range projects {
		var n int64
		db.Model(&models.StatusDefinition{}).
			Where("project_id = ?", p.ID).Count(&n)
		if n > 0 {
			continue
		}
		for _, seed := range models.DefaultStatusSeed {
			row := seed
			row.ProjectID = p.ID
			db.Create(&row)
		}
	}
	return nil
}
