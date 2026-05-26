package models

import (
	"time"

	"gorm.io/gorm"
)

// ASRConfig ASR 提供商配置
type ASRConfig struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	UserID          uint           `gorm:"not null;index" json:"user_id"`
	Provider        string         `gorm:"not null" json:"provider"` // xunfei, aliyun, tencent, baidu, whisper
	APIKey          string         `json:"-"`
	ApiSecret       string         `json:"-"` // 讯飞等需要
	AppID           string         `json:"-"` // 讯飞/阿里云等需要
	AccessKeyID     string         `json:"-"` // 阿里云等需要
	AccessSecret    string         `json:"-"` // 阿里云等需要
	AppKey          string         `json:"-"` // 阿里云/百度等需要
	Region          string         `json:"region"` // 阿里云等需要
	BaseURL         string         `json:"base_url"`
	IsDefault       bool           `gorm:"default:false" json:"is_default"`
	User            User           `gorm:"foreignKey:UserID" json:"-"`
}

// Audio 音频文件
type Audio struct {
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
	Duration  float64        `json:"duration"`
	User      User           `gorm:"foreignKey:UserID" json:"-"`
}

// TranscriptionTask 转写任务
type TranscriptionTask struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	AudioID   uint           `gorm:"not null" json:"audio_id"`
	Title     string         `gorm:"not null" json:"title"`
	Provider  string         `gorm:"not null" json:"provider"`
	Status    string         `gorm:"default:'pending'" json:"status"` // pending, processing, completed, failed
	Result    string         `gorm:"type:text" json:"result"`
	Segments  string         `gorm:"type:text" json:"segments"` // JSON 数组
	Error     string         `json:"error"`
	User      User           `gorm:"foreignKey:UserID" json:"-"`
	Audio     Audio          `gorm:"foreignKey:AudioID" json:"-"`
}
