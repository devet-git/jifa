package database

import (
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
		&models.PersonalAccessToken{},
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
