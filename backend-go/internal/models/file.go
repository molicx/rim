package models

import (
	"time"

	"gorm.io/gorm"
)

type File struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Title     string         `gorm:"not null" json:"title"`
	Filename  string         `gorm:"not null" json:"filename"`
	FilePath  string         `gorm:"not null" json:"-"`
	FileSize  int64          `json:"file_size"`
	FileType  string         `json:"file_type"`
	User      User           `gorm:"foreignKey:UserID" json:"-"`
}
