package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rim/backend-go/internal/models"
	"github.com/rim/backend-go/internal/utils"
	"gorm.io/gorm"
)

type AIConfigHandler struct {
	DB            *gorm.DB
	EncryptionKey string
}

type CreateAIConfigRequest struct {
	Provider     string `json:"provider" binding:"required"`
	ProviderType string `json:"provider_type"`
	Model        string `json:"model" binding:"required"`
	BaseURL      string `json:"base_url"`
	APIKey       string `json:"api_key" binding:"required"`
	IsDefault    bool   `json:"is_default"`
}

type UpdateAIConfigRequest struct {
	Provider     string `json:"provider"`
	ProviderType string `json:"provider_type"`
	Model        string `json:"model"`
	BaseURL      string `json:"base_url"`
	APIKey       string `json:"api_key"`
	IsDefault    *bool  `json:"is_default"`
}

// ASR 配置请求 - 不同提供商使用不同字段，验证在 handler 中进行
type CreateASRConfigRequest struct {
	Provider      string `json:"provider" binding:"required"`
	APIKey        string `json:"api_key"`
	ApiSecret     string `json:"api_secret"`
	AppID         string `json:"app_id"`
	AccessKeyID   string `json:"access_key_id"`
	AccessSecret  string `json:"access_key_secret"`
	AppKey        string `json:"app_key"`
	Region        string `json:"region"`
	BaseURL       string `json:"base_url"`
	IsDefault     bool   `json:"is_default"`
}

type UpdateASRConfigRequest struct {
	Provider      string `json:"provider"`
	APIKey        string `json:"api_key"`
	ApiSecret     string `json:"api_secret"`
	AppID         string `json:"app_id"`
	AccessKeyID   string `json:"access_key_id"`
	AccessSecret  string `json:"access_key_secret"`
	AppKey        string `json:"app_key"`
	Region        string `json:"region"`
	BaseURL       string `json:"base_url"`
	IsDefault     *bool  `json:"is_default"`
}

func (h *AIConfigHandler) CreateConfig(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateAIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encryptedKey, err := utils.Encrypt(req.APIKey, h.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt API key"})
		return
	}

	if req.IsDefault {
		h.DB.Model(&models.AIConfig{}).Where("user_id = ?", userID).Update("is_default", false)
	}

	// 默认为 native 类型
	providerType := req.ProviderType
	if providerType == "" {
		providerType = "native"
	}

	config := models.AIConfig{
		UserID:       userID,
		Provider:     req.Provider,
		ProviderType: providerType,
		Model:        req.Model,
		BaseURL:      req.BaseURL,
		APIKey:       encryptedKey,
		IsDefault:    req.IsDefault,
	}

	if err := h.DB.Create(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create config"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":            config.ID,
		"provider":      config.Provider,
		"provider_type": config.ProviderType,
		"model":         config.Model,
		"base_url":      config.BaseURL,
		"is_default":    config.IsDefault,
	})
}

func (h *AIConfigHandler) ListConfigs(c *gin.Context) {
	userID := c.GetUint("user_id")

	var configs []models.AIConfig
	if err := h.DB.Where("user_id = ?", userID).Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch configs"})
		return
	}

	result := make([]gin.H, len(configs))
	for i, config := range configs {
		result[i] = gin.H{
			"id":            config.ID,
			"provider":      config.Provider,
			"provider_type": config.ProviderType,
			"model":         config.Model,
			"base_url":      config.BaseURL,
			"is_default":    config.IsDefault,
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *AIConfigHandler) DeleteConfig(c *gin.Context) {
	userID := c.GetUint("user_id")
	configID := c.Param("id")

	result := h.DB.Where("id = ? AND user_id = ?", configID, userID).Delete(&models.AIConfig{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete config"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Config deleted successfully"})
}

func (h *AIConfigHandler) UpdateConfig(c *gin.Context) {
	userID := c.GetUint("user_id")
	configID := c.Param("id")

	var config models.AIConfig
	if err := h.DB.Where("id = ? AND user_id = ?", configID, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
		return
	}

	var req UpdateAIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Provider != "" {
		config.Provider = req.Provider
	}
	if req.ProviderType != "" {
		config.ProviderType = req.ProviderType
	}
	if req.Model != "" {
		config.Model = req.Model
	}
	if req.BaseURL != "" {
		config.BaseURL = req.BaseURL
	}
	if req.APIKey != "" {
		encryptedKey, err := utils.Encrypt(req.APIKey, h.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt API key"})
			return
		}
		config.APIKey = encryptedKey
	}
	if req.IsDefault != nil {
		if *req.IsDefault {
			h.DB.Model(&models.AIConfig{}).Where("user_id = ?", userID).Update("is_default", false)
		}
		config.IsDefault = *req.IsDefault
	}

	if err := h.DB.Save(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            config.ID,
		"provider":      config.Provider,
		"provider_type": config.ProviderType,
		"model":         config.Model,
		"base_url":      config.BaseURL,
		"is_default":    config.IsDefault,
	})
}

// ==================== ASR 配置管理 ====================

func (h *AIConfigHandler) CreateASRConfig(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateASRConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("CreateASRConfig bind error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	log.Printf("CreateASRConfig: provider=%s, api_key=%s, api_secret=%s, app_id=%s, access_key_id=%s, access_secret=%s, app_key=%s, region=%s",
		req.Provider, req.APIKey, req.ApiSecret, req.AppID, req.AccessKeyID, req.AccessSecret, req.AppKey, req.Region)

	// 根据提供商验证必填字段（统一使用 api_key 字段接收）
	switch req.Provider {
	case "xunfei":
		if req.APIKey == "" || req.ApiSecret == "" || req.AppID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "讯飞配置需要 API Key、API Secret 和 App ID"})
			return
		}
	case "aliyun":
		// 阿里云：前端发送 access_key_id, access_key_secret, app_key
		if req.AccessKeyID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "阿里云配置需要 Access Key ID"})
			return
		}
		if req.AccessSecret == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "阿里云配置需要 Access Key Secret"})
			return
		}
		if req.AppKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "阿里云配置需要 App Key"})
			return
		}
	case "whisper":
		if req.APIKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Whisper 配置需要 API Key"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的 ASR 提供商: " + req.Provider})
		return
	}

	// 加密敏感字段 - 根据提供商类型分别处理
	var encryptedKey, encryptedSecret, encryptedAccessSecret string
	var err error

	switch req.Provider {
	case "xunfei", "whisper":
		// 讯飞/Whisper：加密 APIKey
		if req.APIKey != "" {
			encryptedKey, err = utils.Encrypt(req.APIKey, h.EncryptionKey)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt API key"})
				return
			}
		}
		if req.ApiSecret != "" {
			encryptedSecret, err = utils.Encrypt(req.ApiSecret, h.EncryptionKey)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt API secret"})
				return
			}
		}
	case "aliyun":
		// 阿里云：加密 AccessKeyID 和 AccessSecret
		if req.AccessKeyID != "" {
			encryptedKey, err = utils.Encrypt(req.AccessKeyID, h.EncryptionKey)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt access key"})
				return
			}
		}
		if req.AccessSecret != "" {
			encryptedAccessSecret, err = utils.Encrypt(req.AccessSecret, h.EncryptionKey)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt access secret"})
				return
			}
		}
	}

	config := models.ASRConfig{
		UserID:         userID,
		Provider:       req.Provider,
		APIKey:         encryptedKey,
		ApiSecret:      encryptedSecret,
		AppID:          req.AppID,
		AccessKeyID:    req.AccessKeyID,
		AccessSecret:   encryptedAccessSecret,
		AppKey:         req.AppKey,
		Region:         req.Region,
		BaseURL:        req.BaseURL,
		IsDefault:      req.IsDefault,
	}

	if req.IsDefault {
		h.DB.Model(&models.ASRConfig{}).Where("user_id = ?", userID).Update("is_default", false)
	}

	if err := h.DB.Create(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ASR config"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         config.ID,
		"provider":   config.Provider,
		"app_id":     config.AppID,
		"region":     config.Region,
		"base_url":   config.BaseURL,
		"is_default": config.IsDefault,
		"created_at": config.CreatedAt,
	})
}

func (h *AIConfigHandler) ListASRConfigs(c *gin.Context) {
	userID := c.GetUint("user_id")

	var configs []models.ASRConfig
	if err := h.DB.Where("user_id = ?", userID).Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ASR configs"})
		return
	}

	result := make([]gin.H, len(configs))
	for i, config := range configs {
		result[i] = gin.H{
			"id":         config.ID,
			"provider":   config.Provider,
			"app_id":     config.AppID,
			"region":     config.Region,
			"base_url":   config.BaseURL,
			"is_default": config.IsDefault,
			"created_at": config.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *AIConfigHandler) UpdateASRConfig(c *gin.Context) {
	userID := c.GetUint("user_id")
	configID := c.Param("id")

	var config models.ASRConfig
	if err := h.DB.Where("id = ? AND user_id = ?", configID, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ASR config not found"})
		return
	}

	var req UpdateASRConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 更新字段
	if req.Provider != "" {
		config.Provider = req.Provider
	}
	if req.APIKey != "" {
		encryptedKey, err := utils.Encrypt(req.APIKey, h.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt API key"})
			return
		}
		config.APIKey = encryptedKey
	}
	if req.ApiSecret != "" {
		encryptedSecret, err := utils.Encrypt(req.ApiSecret, h.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt API secret"})
			return
		}
		config.ApiSecret = encryptedSecret
	}
	if req.AppID != "" {
		config.AppID = req.AppID
	}
	if req.AccessKeyID != "" {
		config.AccessKeyID = req.AccessKeyID
	}
	if req.AccessSecret != "" {
		encryptedAccessSecret, err := utils.Encrypt(req.AccessSecret, h.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt access secret"})
			return
		}
		config.AccessSecret = encryptedAccessSecret
	}
	if req.AppKey != "" {
		config.AppKey = req.AppKey
	}
	if req.Region != "" {
		config.Region = req.Region
	}
	if req.BaseURL != "" {
		config.BaseURL = req.BaseURL
	}
	if req.IsDefault != nil {
		if *req.IsDefault {
			h.DB.Model(&models.ASRConfig{}).Where("user_id = ?", userID).Update("is_default", false)
		}
		config.IsDefault = *req.IsDefault
	}

	if err := h.DB.Save(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ASR config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         config.ID,
		"provider":   config.Provider,
		"app_id":     config.AppID,
		"region":     config.Region,
		"base_url":   config.BaseURL,
		"is_default": config.IsDefault,
	})
}

func (h *AIConfigHandler) DeleteASRConfig(c *gin.Context) {
	userID := c.GetUint("user_id")
	configID := c.Param("id")

	result := h.DB.Where("id = ? AND user_id = ?", configID, userID).Delete(&models.ASRConfig{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ASR config"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ASR config not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ASR config deleted successfully"})
}
