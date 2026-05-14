package main

import (
	"log"

	"jifa/backend/config"
	"jifa/backend/internal/api"
	"jifa/backend/internal/api/handlers"
	"jifa/backend/internal/mailer"
	"jifa/backend/pkg/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	cfg := config.Load()
	mailer.Init(cfg)

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	if err := database.SeedStatuses(db); err != nil {
		log.Printf("status seed warning: %v", err)
	}

	go handlers.RunDigestScheduler(db)

	router := api.NewRouter(db, cfg)
	log.Printf("Server starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
