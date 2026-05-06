package models

import (
	"time"

	"gorm.io/gorm"
)

type AIConfig struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	UserID       uint           `gorm:"not null;index" json:"user_id"`
	Provider     string         `gorm:"not null" json:"provider"`
	ProviderType string         `gorm:"default:'native'" json:"provider_type"` // native, openai_compatible
	Model        string         `gorm:"not null" json:"model"`
	BaseURL      string         `json:"base_url"`                              // 自定义 API 端点
	APIKey       string         `gorm:"not null" json:"-"`
	IsDefault    bool           `gorm:"default:false" json:"is_default"`
	User         User           `gorm:"foreignKey:UserID" json:"-"`
}
