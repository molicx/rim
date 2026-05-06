package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Config struct {
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	JWTSecret      string
	PythonAIURL    string
	ServerPort     string
	EncryptionKey  string
}

func LoadConfig() *Config {
	godotenv.Load()

	return &Config{
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBUser:        getEnv("DB_USER", "rim_user"),
		DBPassword:    getEnv("DB_PASSWORD", "rim_password"),
		DBName:        getEnv("DB_NAME", "rim_db"),
		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		PythonAIURL:   getEnv("PYTHON_AI_URL", "http://localhost:8000"),
		ServerPort:    getEnv("SERVER_PORT", "3000"),
		EncryptionKey: getEnv("ENCRYPTION_KEY", "32-byte-key-for-aes-encryption!!"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func InitDB(cfg *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}
