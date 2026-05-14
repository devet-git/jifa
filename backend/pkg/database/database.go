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
		&models.WikiPage{},
	)
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
