package models

import (
	"time"

	"gorm.io/gorm"
)

type Summary struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	SourceType  string         `gorm:"not null" json:"source_type"`
	SourceURL   string         `json:"source_url"`
	OriginalText string        `gorm:"type:text" json:"original_text"`
	SummaryText string         `gorm:"type:text" json:"summary_text"`
	KeyPoints   string         `gorm:"type:text" json:"key_points"`
	Provider    string         `json:"provider"`
	Model       string         `json:"model"`
	User        User           `gorm:"foreignKey:UserID" json:"-"`
}
