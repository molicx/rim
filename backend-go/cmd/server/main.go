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

	if err := db.AutoMigrate(&models.User{}, &models.AIConfig{}, &models.Summary{}, &models.File{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	r := gin.Default()

	// 添加请求日志中间件
	r.Use(func(c *gin.Context) {
		log.Printf("Incoming request: %s %s from %s, Origin: %s",
			c.Request.Method,
			c.Request.URL.Path,
			c.Request.RemoteAddr,
			c.Request.Header.Get("Origin"))
		c.Next()
		log.Printf("Response status: %d for %s %s", c.Writer.Status(), c.Request.Method, c.Request.URL.Path)
	})

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://localhost:3001",
			"http://127.0.0.1:5173",
			"http://172.21.0.8:5173", // Docker 网络
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowWildcard:    true,
		AllowOriginFunc: func(origin string) bool {
			// 允许所有 localhost 和 127.0.0.1 的请求
			// 以及 Docker 内部网络 (172.x.x.x)
			return true // 开发环境允许所有来源
		},
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

	fileHandler := &handlers.FileHandler{
		DB:            db,
		PythonAIURL:   cfg.PythonAIURL,
		EncryptionKey: cfg.EncryptionKey,
		UploadDir:     "/app/uploads",
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
			protected.PUT("/ai-configs/:id", aiConfigHandler.UpdateConfig)
			protected.DELETE("/ai-configs/:id", aiConfigHandler.DeleteConfig)

			protected.POST("/summaries", summaryHandler.CreateSummary)
			protected.GET("/summaries", summaryHandler.ListSummaries)
			protected.GET("/summaries/:id", summaryHandler.GetSummary)
			protected.DELETE("/summaries/:id", summaryHandler.DeleteSummary)
			protected.GET("/summaries/:id/export", summaryHandler.ExportSummary)

			protected.POST("/files/upload", fileHandler.UploadFile)
			protected.POST("/files/summarize", fileHandler.SummarizeFile)
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
