package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rim/backend-go/internal/models"
	"github.com/rim/backend-go/internal/utils"
	"gorm.io/gorm"
)

type FileHandler struct {
	DB            *gorm.DB
	PythonAIURL   string
	EncryptionKey string
	UploadDir     string
}

type FileUploadResponse struct {
	ID       uint   `json:"id"`
	Title    string `json:"title"`
	Filename string `json:"filename"`
	FileSize int64  `json:"file_size"`
}

func (h *FileHandler) UploadFile(c *gin.Context) {
	userID := c.GetUint("user_id")

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要上传的文件"})
		return
	}
	defer file.Close()

	filename := header.Filename
	fileSize := header.Size
	ext := strings.ToLower(filepath.Ext(filename))

	// 验证文件类型
	allowedExts := map[string]bool{".pdf": true, ".docx": true, ".txt": true, ".md": true}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的文件类型，仅支持 PDF、Word、TXT、Markdown"})
		return
	}

	// 验证文件大小 (10MB)
	if fileSize > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件大小不能超过 10MB"})
		return
	}

	// 保存文件
	safeFilename := fmt.Sprintf("%d_%d%s", userID, time.Now().Unix(), ext)
	uploadPath := filepath.Join(h.UploadDir, safeFilename)

	if err := os.MkdirAll(h.UploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建上传目录失败"})
		return
	}

	out, err := os.Create(uploadPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
		return
	}

	title := c.PostForm("title")
	if title == "" {
		title = strings.TrimSuffix(filename, ext)
	}

	// 保存文件记录
	fileRecord := models.File{
		UserID:   userID,
		Title:    title,
		Filename: filename,
		FilePath: uploadPath,
		FileSize: fileSize,
		FileType: ext,
	}

	if err := h.DB.Create(&fileRecord).Error; err != nil {
		os.Remove(uploadPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件记录失败"})
		return
	}

	c.JSON(http.StatusCreated, FileUploadResponse{
		ID:       fileRecord.ID,
		Title:    fileRecord.Title,
		Filename: fileRecord.Filename,
		FileSize: fileRecord.FileSize,
	})
}

func (h *FileHandler) SummarizeFile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		FileID  uint   `json:"file_id"`
		Title   string `json:"title"`
		ConfigID uint  `json:"config_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	// 获取文件记录
	var fileRecord models.File
	if err := h.DB.Where("id = ? AND user_id = ?", req.FileID, userID).First(&fileRecord).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	// 调用 Python 服务解析文件
	text, err := h.extractTextFromFile(fileRecord.FilePath, fileRecord.FileType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("文件解析失败: %v", err)})
		return
	}

	// 获取 AI 配置
	var config models.AIConfig
	if req.ConfigID > 0 {
		if err := h.DB.Where("id = ? AND user_id = ?", req.ConfigID, userID).First(&config).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "AI 配置不存在"})
			return
		}
	} else {
		if err := h.DB.Where("user_id = ? AND is_default = ?", userID, true).First(&config).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请先设置默认 AI 配置"})
			return
		}
	}

	// 调用 AI 总结
	decryptedKey, err := utils.Decrypt(config.APIKey, h.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "API Key 解密失败"})
		return
	}

	aiReq := PythonAIRequest{
		Text:         text,
		Provider:     config.Provider,
		Model:        config.Model,
		APIKey:       decryptedKey,
		ProviderType: config.ProviderType,
		BaseURL:      config.BaseURL,
	}

	aiResp, err := h.callPythonAI(aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI 服务错误: %v", err)})
		return
	}

	title := req.Title
	if title == "" {
		title = fileRecord.Title
	}

	keyPointsJSON, _ := json.Marshal(aiResp.KeyPoints)

	summary := models.Summary{
		UserID:       userID,
		Title:        title,
		SourceType:   "file",
		OriginalText: text,
		SummaryText:  aiResp.Summary,
		KeyPoints:    string(keyPointsJSON),
		Provider:     config.Provider,
		Model:        config.Model,
	}

	if err := h.DB.Create(&summary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存总结失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         summary.ID,
		"title":      summary.Title,
		"summary":    summary.SummaryText,
		"key_points": aiResp.KeyPoints,
		"provider":   summary.Provider,
		"model":      summary.Model,
		"created_at": summary.CreatedAt,
	})
}

func (h *FileHandler) callPythonAI(req PythonAIRequest) (*PythonAIResponse, error) {
	return CallPythonAI(h.PythonAIURL, req)
}

func (h *FileHandler) extractTextFromFile(filePath, fileType string) (string, error) {
	type ParseRequest struct {
		FilePath string `json:"file_path"`
		FileType string `json:"file_type"`
	}

	jsonData, _ := json.Marshal(ParseRequest{FilePath: filePath, FileType: fileType})

	resp, err := http.Post(h.PythonAIURL+"/api/v1/parse-file", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("解析服务返回错误: %s", string(body))
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Text, nil
}
