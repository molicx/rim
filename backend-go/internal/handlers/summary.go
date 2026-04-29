package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rim/backend-go/internal/models"
	"github.com/rim/backend-go/internal/utils"
	"gorm.io/gorm"
)

type SummaryHandler struct {
	DB            *gorm.DB
	PythonAIURL   string
	EncryptionKey string
}

type CreateSummaryRequest struct {
	Text       string `json:"text"`
	URL        string `json:"url"`
	ConfigID   uint   `json:"config_id"`
	Title      string `json:"title"`
}

type PythonAIRequest struct {
	Text     string `json:"text"`
	Provider string `json:"provider"`
	Model    string `json:"model"`
	APIKey   string `json:"api_key"`
}

type PythonAIResponse struct {
	Summary   string   `json:"summary"`
	KeyPoints []string `json:"key_points"`
}

func (h *SummaryHandler) CreateSummary(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateSummaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var text string
	var sourceType string
	var sourceURL string

	if req.Text != "" {
		text = req.Text
		sourceType = "text"
	} else if req.URL != "" {
		extractedText, err := h.extractTextFromURL(req.URL)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to extract text from URL"})
			return
		}
		text = extractedText
		sourceType = "url"
		sourceURL = req.URL
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Either text or url is required"})
		return
	}

	var config models.AIConfig
	if req.ConfigID > 0 {
		if err := h.DB.Where("id = ? AND user_id = ?", req.ConfigID, userID).First(&config).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "AI config not found"})
			return
		}
	} else {
		if err := h.DB.Where("user_id = ? AND is_default = ?", userID, true).First(&config).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No default AI config found"})
			return
		}
	}

	decryptedKey, err := utils.Decrypt(config.APIKey, h.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decrypt API key"})
		return
	}

	aiReq := PythonAIRequest{
		Text:     text,
		Provider: config.Provider,
		Model:    config.Model,
		APIKey:   decryptedKey,
	}

	aiResp, err := h.callPythonAI(aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI service error: %v", err)})
		return
	}

	keyPointsJSON, _ := json.Marshal(aiResp.KeyPoints)

	summary := models.Summary{
		UserID:       userID,
		Title:        req.Title,
		SourceType:   sourceType,
		SourceURL:    sourceURL,
		OriginalText: text,
		SummaryText:  aiResp.Summary,
		KeyPoints:    string(keyPointsJSON),
		Provider:     config.Provider,
		Model:        config.Model,
	}

	if err := h.DB.Create(&summary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save summary"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":          summary.ID,
		"title":       summary.Title,
		"summary":     summary.SummaryText,
		"key_points":  aiResp.KeyPoints,
		"provider":    summary.Provider,
		"model":       summary.Model,
		"created_at":  summary.CreatedAt,
	})
}

func (h *SummaryHandler) ListSummaries(c *gin.Context) {
	userID := c.GetUint("user_id")

	var summaries []models.Summary
	if err := h.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&summaries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch summaries"})
		return
	}

	result := make([]gin.H, len(summaries))
	for i, s := range summaries {
		var keyPoints []string
		json.Unmarshal([]byte(s.KeyPoints), &keyPoints)

		result[i] = gin.H{
			"id":          s.ID,
			"title":       s.Title,
			"source_type": s.SourceType,
			"source_url":  s.SourceURL,
			"summary":     s.SummaryText,
			"key_points":  keyPoints,
			"provider":    s.Provider,
			"model":       s.Model,
			"created_at":  s.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *SummaryHandler) GetSummary(c *gin.Context) {
	userID := c.GetUint("user_id")
	summaryID := c.Param("id")

	var summary models.Summary
	if err := h.DB.Where("id = ? AND user_id = ?", summaryID, userID).First(&summary).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Summary not found"})
		return
	}

	var keyPoints []string
	json.Unmarshal([]byte(summary.KeyPoints), &keyPoints)

	c.JSON(http.StatusOK, gin.H{
		"id":            summary.ID,
		"title":         summary.Title,
		"source_type":   summary.SourceType,
		"source_url":    summary.SourceURL,
		"original_text": summary.OriginalText,
		"summary":       summary.SummaryText,
		"key_points":    keyPoints,
		"provider":      summary.Provider,
		"model":         summary.Model,
		"created_at":    summary.CreatedAt,
	})
}

func (h *SummaryHandler) callPythonAI(req PythonAIRequest) (*PythonAIResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(h.PythonAIURL+"/api/v1/summarize", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI service returned status %d: %s", resp.StatusCode, string(body))
	}

	var aiResp PythonAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return nil, err
	}

	return &aiResp, nil
}

func (h *SummaryHandler) extractTextFromURL(url string) (string, error) {
	jsonData, _ := json.Marshal(map[string]string{"url": url})
	resp, err := http.Post(h.PythonAIURL+"/api/v1/extract", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to extract text")
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Text, nil
}
