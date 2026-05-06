package handlers

import (
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
