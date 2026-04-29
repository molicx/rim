package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/rim/backend-go/internal/config"
	"github.com/rim/backend-go/internal/handlers"
	"github.com/rim/backend-go/internal/middleware"
	"github.com/rim/backend-go/internal/models"
)

func main() {
	cfg := config.LoadConfig()

	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := db.AutoMigrate(&models.User{}, &models.AIConfig{}, &models.Summary{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	authHandler := &handlers.AuthHandler{
		DB:        db,
		JWTSecret: cfg.JWTSecret,
	}

	aiConfigHandler := &handlers.AIConfigHandler{
		DB:            db,
		EncryptionKey: cfg.EncryptionKey,
	}

	summaryHandler := &handlers.SummaryHandler{
		DB:            db,
		PythonAIURL:   cfg.PythonAIURL,
		EncryptionKey: cfg.EncryptionKey,
	}

	api := r.Group("/api/v1")
	{
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			protected.POST("/ai-configs", aiConfigHandler.CreateConfig)
			protected.GET("/ai-configs", aiConfigHandler.ListConfigs)
			protected.DELETE("/ai-configs/:id", aiConfigHandler.DeleteConfig)

			protected.POST("/summaries", summaryHandler.CreateSummary)
			protected.GET("/summaries", summaryHandler.ListSummaries)
			protected.GET("/summaries/:id", summaryHandler.GetSummary)
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
