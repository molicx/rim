package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

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
	Length     string `json:"length,omitempty"` // brief, standard, detailed
	Style      string `json:"style,omitempty"`  // points, paragraph, qa
}

type PythonAIRequest struct {
	Text         string `json:"text"`
	Provider     string `json:"provider"`
	Model        string `json:"model"`
	APIKey       string `json:"api_key"`
	ProviderType string `json:"provider_type,omitempty"`
	BaseURL      string `json:"base_url,omitempty"`
	Length       string `json:"length,omitempty"`
	Style        string `json:"style,omitempty"`
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
		extractedText, extractedTitle, err := h.extractTextFromURL(req.URL)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		text = extractedText
		sourceType = "url"
		sourceURL = req.URL
		if req.Title == "" && extractedTitle != "" {
			req.Title = extractedTitle
		}
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
    Text:         text,
    Provider:     config.Provider,
    Model:        config.Model,
    APIKey:       decryptedKey,
    ProviderType: config.ProviderType,
    BaseURL:      config.BaseURL,
    Length:       req.Length,
    Style:        req.Style,
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

func (h *SummaryHandler) DeleteSummary(c *gin.Context) {
	userID := c.GetUint("user_id")
	summaryID := c.Param("id")

	var summary models.Summary
	if err := h.DB.Where("id = ? AND user_id = ?", summaryID, userID).First(&summary).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Summary not found"})
		return
	}

	if err := h.DB.Delete(&summary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete summary"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Summary deleted successfully"})
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

func (h *SummaryHandler) extractTextFromURL(url string) (string, string, error) {
	jsonData, _ := json.Marshal(map[string]string{"url": url})
	resp, err := http.Post(h.PythonAIURL+"/api/v1/extract", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", fmt.Errorf("无法连接到内容提取服务: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// 尝试解析 Python 服务的错误响应
		var errorResponse struct {
			Detail string `json:"detail"`
		}
		if json.Unmarshal(body, &errorResponse) == nil && errorResponse.Detail != "" {
			return "", "", fmt.Errorf("内容提取失败: %s", errorResponse.Detail)
		}
		return "", "", fmt.Errorf("内容提取服务返回错误 (状态码: %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Text  string `json:"text"`
		Title string `json:"title"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", fmt.Errorf("解析提取结果失败: %v", err)
	}

	return result.Text, result.Title, nil
}

func (h *SummaryHandler) ExportSummary(c *gin.Context) {
	userID := c.GetUint("user_id")
	summaryID := c.Param("id")
	exportFormat := c.DefaultQuery("format", "markdown")

	var summary models.Summary
	if err := h.DB.Where("id = ? AND user_id = ?", summaryID, userID).First(&summary).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "总结不存在"})
		return
	}

	var keyPoints []string
	json.Unmarshal([]byte(summary.KeyPoints), &keyPoints)

	switch exportFormat {
	case "markdown":
		c.Header("Content-Type", "text/markdown; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.md\"", summary.Title))
		content := h.buildMarkdown(summary, keyPoints)
		c.String(http.StatusOK, content)

	case "text":
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.txt\"", summary.Title))
		content := h.buildText(summary, keyPoints)
		c.String(http.StatusOK, content)

	case "pdf":
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.pdf\"", summary.Title))
		pdfBytes, err := h.buildPDF(summary, keyPoints)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "PDF 生成失败"})
			return
		}
		c.Data(http.StatusOK, "application/pdf", pdfBytes)

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的导出格式"})
	}
}

func (h *SummaryHandler) buildMarkdown(summary models.Summary, keyPoints []string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# %s\n\n", summary.Title))
	sb.WriteString(fmt.Sprintf("> 生成时间: %s\n", summary.CreatedAt.Format("2006-01-02 15:04")))
	sb.WriteString(fmt.Sprintf("> 模型: %s - %s\n\n", summary.Provider, summary.Model))

	sb.WriteString("## 总结\n\n")
	sb.WriteString(summary.SummaryText)
	sb.WriteString("\n\n")

	if len(keyPoints) > 0 {
		sb.WriteString("## 关键要点\n\n")
		for i, point := range keyPoints {
			sb.WriteString(fmt.Sprintf("%d. %s\n", i+1, point))
		}
		sb.WriteString("\n")
	}

	if summary.SourceURL != "" {
		sb.WriteString(fmt.Sprintf("## 原文链接\n\n%s\n", summary.SourceURL))
	}

	return sb.String()
}

func (h *SummaryHandler) buildText(summary models.Summary, keyPoints []string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("%s\n", summary.Title))
	sb.WriteString(strings.Repeat("=", 40) + "\n\n")
	sb.WriteString(fmt.Sprintf("生成时间: %s\n", summary.CreatedAt.Format("2006-01-02 15:04")))
	sb.WriteString(fmt.Sprintf("模型: %s - %s\n\n", summary.Provider, summary.Model))

	sb.WriteString("【总结】\n\n")
	sb.WriteString(summary.SummaryText)
	sb.WriteString("\n\n")

	if len(keyPoints) > 0 {
		sb.WriteString("【关键要点】\n\n")
		for i, point := range keyPoints {
			sb.WriteString(fmt.Sprintf("%d. %s\n", i+1, point))
		}
		sb.WriteString("\n")
	}

	if summary.SourceURL != "" {
		sb.WriteString(fmt.Sprintf("【原文链接】\n\n%s\n", summary.SourceURL))
	}

	return sb.String()
}

func (h *SummaryHandler) buildPDF(summary models.Summary, keyPoints []string) ([]byte, error) {
	jsonData, _ := json.Marshal(map[string]interface{}{
		"title":      summary.Title,
		"summary":    summary.SummaryText,
		"key_points": keyPoints,
		"provider":   summary.Provider,
		"model":      summary.Model,
		"created_at": summary.CreatedAt.Format("2006-01-02 15:04"),
		"source_url": summary.SourceURL,
	})

	resp, err := http.Post(h.PythonAIURL+"/api/v1/export-pdf", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PDF 生成服务返回错误")
	}

	return io.ReadAll(resp.Body)
}
