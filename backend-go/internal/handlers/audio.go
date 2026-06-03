package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
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

type AudioHandler struct {
	DB            *gorm.DB
	PythonAIURL   string
	EncryptionKey string
	UploadDir     string
}

type AudioUploadResponse struct {
	ID       uint    `json:"id"`
	Title    string  `json:"title"`
	Filename string  `json:"filename"`
	FileSize int64   `json:"file_size"`
	Duration float64 `json:"duration,omitempty"`
}

// 播客链接请求
type PodcastURLRequest struct {
	URL string `json:"url" binding:"required"`
}

// 播客处理响应
type PodcastProcessResponse struct {
	AudioID   uint   `json:"audio_id"`
	Title     string `json:"title"`
	SourceURL string `json:"source_url"`
	URLType   string `json:"url_type"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}

type TranscribeRequest struct {
	AudioID    uint   `json:"audio_id"`
	Title      string `json:"title"`
	Provider   string `json:"provider"` // xunfei, aliyun, whisper
	ConfigID   uint   `json:"config_id"`
}

type TranscriptionTaskResponse struct {
	TaskID  string `json:"task_id"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

// UploadAudio 上传音频文件
func (h *AudioHandler) UploadAudio(c *gin.Context) {
	userID := c.GetUint("user_id")

	file, header, err := c.Request.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要上传的音频文件"})
		return
	}
	defer file.Close()

	filename := header.Filename
	fileSize := header.Size
	ext := strings.ToLower(filepath.Ext(filename))

	// 验证文件类型
	allowedExts := map[string]bool{".mp3": true, ".mp4": true, ".wav": true, ".m4a": true, ".flac": true, ".ogg": true, ".aac": true}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的音频格式，仅支持 mp3、mp4、wav、m4a、flac、ogg、aac"})
		return
	}

	// 验证文件大小 (500MB)
	if fileSize > 500*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "音频文件不能超过 500MB"})
		return
	}

	// 保存文件
	safeFilename := fmt.Sprintf("%d_%d%s", userID, time.Now().Unix(), ext)
	uploadPath := filepath.Join(h.UploadDir, "audio", safeFilename)

	if err := os.MkdirAll(filepath.Dir(uploadPath), 0755); err != nil {
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
	audio := models.Audio{
		UserID:   userID,
		Title:    title,
		Filename: filename,
		FilePath: uploadPath,
		FileSize: fileSize,
		FileType: ext,
	}

	if err := h.DB.Create(&audio).Error; err != nil {
		os.Remove(uploadPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存记录失败"})
		return
	}

	c.JSON(http.StatusCreated, AudioUploadResponse{
		ID:       audio.ID,
		Title:    audio.Title,
		Filename: audio.Filename,
		FileSize: audio.FileSize,
	})
}

// TranscribeAudio 提交转写任务
func (h *AudioHandler) TranscribeAudio(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req TranscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	// 获取音频文件记录
	var audio models.Audio
	if err := h.DB.Where("id = ? AND user_id = ?", req.AudioID, userID).First(&audio).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "音频文件不存在"})
		return
	}

	// 获取 ASR 配置 - 优先使用指定 ConfigID，否则根据 provider 查找，最后回退到默认配置
	var config models.ASRConfig
	if req.ConfigID > 0 {
		if err := h.DB.Where("id = ? AND user_id = ?", req.ConfigID, userID).First(&config).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "ASR 配置不存在"})
			return
		}
	} else if req.Provider != "" {
		// 根据 provider 名称查找配置
		log.Printf("Looking for ASR config: user_id=%d, provider=%s", userID, req.Provider)
		if err := h.DB.Where("user_id = ? AND provider = ?", userID, req.Provider).First(&config).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// 列出用户所有 ASR 配置用于调试
				var allConfigs []models.ASRConfig
				h.DB.Where("user_id = ?", userID).Find(&allConfigs)
				var providers []string
				for _, c := range allConfigs {
					providers = append(providers, c.Provider)
				}
				log.Printf("User %d ASR configs: %v", userID, providers)
				c.JSON(http.StatusBadRequest, gin.H{"error": "未找到 " + req.Provider + " 的 ASR 配置"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询 ASR 配置失败"})
			return
		}
	} else {
		// 回退到默认配置
		if err := h.DB.Where("user_id = ? AND is_default = ?", userID, true).First(&config).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusBadRequest, gin.H{"error": "请先配置语音识别服务"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询 ASR 配置失败"})
			return
		}
	}

	// 根据提供商类型解密对应字段
	var decryptedKey, decryptedSecret string
	var err error
	switch config.Provider {
	case "xunfei", "whisper":
		if config.APIKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ASR 配置中 API Key 为空，请重新配置"})
			return
		}
		log.Printf("Decrypting API key: config_id=%d, provider=%s, key_length=%d", config.ID, config.Provider, len(config.APIKey))
		decryptedKey, err = utils.Decrypt(config.APIKey, h.EncryptionKey)
		if err != nil {
			log.Printf("API Key decrypt error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "API Key 解密失败，请删除并重新添加 ASR 配置"})
			return
		}
		if config.ApiSecret != "" {
			decryptedSecret, err = utils.Decrypt(config.ApiSecret, h.EncryptionKey)
			if err != nil {
				log.Printf("API Secret decrypt error: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "API Secret 解密失败，请删除并重新添加 ASR 配置"})
				return
			}
		}
	case "aliyun":
		if config.APIKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ASR 配置中 Access Key ID 为空，请重新配置"})
			return
		}
		log.Printf("Decrypting Access Key: config_id=%d, provider=%s, key_length=%d", config.ID, config.Provider, len(config.APIKey))
		decryptedKey, err = utils.Decrypt(config.APIKey, h.EncryptionKey)
		if err != nil {
			log.Printf("Access Key decrypt error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Access Key 解密失败，请删除并重新添加 ASR 配置"})
			return
		}
		if config.AccessSecret != "" {
			decryptedSecret, err = utils.Decrypt(config.AccessSecret, h.EncryptionKey)
			if err != nil {
				log.Printf("Access Secret decrypt error: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Access Secret 解密失败，请删除并重新添加 ASR 配置"})
				return
			}
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的 ASR 提供商: " + config.Provider})
		return
	}

	// 创建转写任务
	task := models.TranscriptionTask{
		UserID:   userID,
		AudioID:  audio.ID,
		Provider: req.Provider,
		Status:   "pending",
	}

	title := req.Title
	if title == "" {
		title = audio.Title
	}
	task.Title = title

	if err := h.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建转写任务失败"})
		return
	}

	// 同步提交 Celery 任务（确保任务入队后再返回）
	log.Printf("Submitting celery task: task_id=%d, provider=%s, audio=%s", task.ID, req.Provider, audio.FilePath)
	
	err = h.submitTranscriptionTaskToCelery(task.ID, audio.FilePath, req.Provider, decryptedKey, decryptedSecret, config)
	if err != nil {
		log.Printf("Failed to submit celery task: %v", err)
		h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{"status": "failed", "error": err.Error()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提交转写任务失败: " + err.Error()})
		return
	}
	
	log.Printf("Celery task submitted for task_id=%d", task.ID)

	c.JSON(http.StatusAccepted, TranscriptionTaskResponse{
		TaskID:  fmt.Sprintf("%d", task.ID),
		Status:  "pending",
		Message: "转写任务已提交，请稍后查询结果",
	})
}

// GetTranscriptionStatus 查询转写状态
func (h *AudioHandler) GetTranscriptionStatus(c *gin.Context) {
	userID := c.GetUint("user_id")
	taskID := c.Param("id")

	var task models.TranscriptionTask
	if err := h.DB.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "转写任务不存在"})
		return
	}

	// 解析 segments JSON 字符串为数组
	var segments interface{}
	if task.Segments != "" {
		if err := json.Unmarshal([]byte(task.Segments), &segments); err != nil {
			log.Printf("Failed to parse segments: %v", err)
			segments = []interface{}{}
		}
	} else {
		segments = []interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         task.ID,
		"status":     task.Status,
		"title":      task.Title,
		"provider":   task.Provider,
		"text":       task.Result,
		"segments":   segments,
		"created_at": task.CreatedAt,
		"updated_at": task.UpdatedAt,
	})
}

// ListTranscriptionTasks 获取转写任务列表
func (h *AudioHandler) ListTranscriptionTasks(c *gin.Context) {
	userID := c.GetUint("user_id")

	var tasks []models.TranscriptionTask
	if err := h.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务列表失败"})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// submitTranscriptionTaskToCelery 提交转写任务到 Celery 队列
func (h *AudioHandler) submitTranscriptionTaskToCelery(taskID uint, audioPath, provider string, apiKey string, apiSecret string, config models.ASRConfig) error {
	// 构建配置
	providerConfig := map[string]interface{}{
		"api_key": apiKey,
	}

	switch provider {
	case "xunfei":
		if apiSecret != "" {
			providerConfig["api_secret"] = apiSecret
		}
		providerConfig["app_id"] = config.AppID
	case "aliyun":
		if apiSecret != "" {
			providerConfig["access_key_secret"] = apiSecret
		}
		providerConfig["access_key_id"] = apiKey
		providerConfig["app_key"] = config.AppKey
	}

	// 通过 HTTP 调用 Python Celery 任务接口
	type CeleryTaskRequest struct {
		TaskID   int                    `json:"task_id"`
		Audio    string                 `json:"audio_path"`
		Provider string                 `json:"provider"`
		Config   map[string]interface{} `json:"config"`
	}

	reqBody, _ := json.Marshal(CeleryTaskRequest{
		TaskID:   int(taskID),
		Audio:    audioPath,
		Provider: provider,
		Config:   providerConfig,
	})

	url := h.PythonAIURL + "/api/v1/transcribe-async"
	log.Printf("Calling Python transcribe-async: url=%s, task_id=%d", url, taskID)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(
		url,
		"application/json",
		bytes.NewBuffer(reqBody),
	)
	if err != nil {
		log.Printf("Failed to call Python transcribe-async: %v", err)
		h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", taskID).Updates(map[string]interface{}{"status": "failed", "error": err.Error()})
		return fmt.Errorf("调用 Python 转写服务失败: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	log.Printf("Python transcribe-async response: status=%d, body=%s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		log.Printf("Celery task submission failed with status: %d, body: %s", resp.StatusCode, string(body))
		h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", taskID).Updates(map[string]interface{}{"status": "failed", "error": string(body)})
		return fmt.Errorf("Python 转写服务返回错误: status=%d, body=%s", resp.StatusCode, string(body))
	}

	// 更新任务状态为处理中
	h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", taskID).Update("status", "processing")
	log.Printf("Task status updated to processing for task_id=%d", taskID)
	return nil
}

// ProcessPodcastURL 处理播客链接
func (h *AudioHandler) ProcessPodcastURL(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req PodcastURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入有效的 URL"})
		return
	}

	// 调用 Python 服务处理播客链接
	type PodcastProcessRequest struct {
		URL       string `json:"url"`
		UploadDir string `json:"upload_dir"`
	}

	reqBody, _ := json.Marshal(PodcastProcessRequest{
		URL:       req.URL,
		UploadDir: h.UploadDir,
	})

	resp, err := http.Post(
		h.PythonAIURL+"/api/v1/process-podcast",
		"application/json",
		bytes.NewBuffer(reqBody),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "播客处理服务不可用"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}

	// 解析 Python 服务的响应
	var result struct {
		AudioPath string `json:"audio_path"`
		Title     string `json:"title"`
		URLType   string `json:"url_type"`
		SourceURL string `json:"source_url"`
		Filename  string `json:"filename"`
		Size      int64  `json:"size"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析响应失败"})
		return
	}

	// 保存音频记录到数据库
	audio := models.Audio{
		UserID:   userID,
		Title:    result.Title,
		Filename: result.Filename,
		FilePath: result.AudioPath,
		FileSize: result.Size,
		FileType: "podcast",
	}

	if err := h.DB.Create(&audio).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存音频记录失败"})
		return
	}

	c.JSON(http.StatusCreated, PodcastProcessResponse{
		AudioID:   audio.ID,
		Title:     audio.Title,
		SourceURL: result.SourceURL,
		URLType:   result.URLType,
		Status:    "downloaded",
		Message:   "音频下载成功，可以开始转写",
	})
}

// TranscriptionCallback Python Celery 任务完成回调
func (h *AudioHandler) TranscriptionCallback(c *gin.Context) {
	type CallbackRequest struct {
		TaskID   int    `json:"task_id"`
		Status   string `json:"status"`
		Result   string `json:"result"`
		Segments string `json:"segments"`
		Duration float64 `json:"duration"`
		Error    string `json:"error"`
	}

	var req CallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求"})
		return
	}

	log.Printf("Transcription callback: task_id=%d, status=%s", req.TaskID, req.Status)

	// 更新任务状态
	updates := map[string]interface{}{
		"status": req.Status,
	}

	if req.Status == "completed" {
		updates["result"] = req.Result
		updates["segments"] = req.Segments
	} else if req.Status == "failed" {
		updates["error"] = req.Error
	}

	if err := h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", req.TaskID).Updates(updates).Error; err != nil {
		log.Printf("Failed to update transcription task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新任务状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// DeleteTranscriptionTask 删除转写任务
func (h *AudioHandler) DeleteTranscriptionTask(c *gin.Context) {
	userID := c.GetUint("user_id")
	taskID := c.Param("id")

	result := h.DB.Where("id = ? AND user_id = ?", taskID, userID).Delete(&models.TranscriptionTask{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "转写任务不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// SummarizeTranscription 从转写任务生成 AI 总结
func (h *AudioHandler) SummarizeTranscription(c *gin.Context) {
	userID := c.GetUint("user_id")
	taskID := c.Param("id")

	var task models.TranscriptionTask
	if err := h.DB.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "转写任务不存在"})
		return
	}

	if task.Status != "completed" || task.Result == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "转写任务未完成，无法生成总结"})
		return
	}

	var config models.AIConfig
	if err := h.DB.Where("user_id = ? AND is_default = ?", userID, true).First(&config).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请先配置默认 AI 模型"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询 AI 配置失败"})
		return
	}

	decryptedKey, err := utils.Decrypt(config.APIKey, h.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "API Key 解密失败"})
		return
	}

	aiReq := PythonAIRequest{
		Text:         task.Result,
		Provider:     config.Provider,
		Model:        config.Model,
		APIKey:       decryptedKey,
		ProviderType: config.ProviderType,
		BaseURL:      config.BaseURL,
	}

	aiResp, err := CallPythonAI(h.PythonAIURL, aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI 总结服务错误: %v", err)})
		return
	}

	keyPointsJSON, _ := json.Marshal(aiResp.KeyPoints)

	summary := models.Summary{
		UserID:       userID,
		Title:        task.Title,
		SourceType:   "transcription",
		OriginalText: task.Result,
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
		"id":          summary.ID,
		"title":       summary.Title,
		"summary":     summary.SummaryText,
		"key_points":  aiResp.KeyPoints,
		"provider":    summary.Provider,
		"model":       summary.Model,
		"created_at":  summary.CreatedAt,
	})
}

// GetAudioFile 提供音频文件下载
func (h *AudioHandler) GetAudioFile(c *gin.Context) {
	userID := c.GetUint("user_id")
	audioID := c.Param("id")

	var audio models.Audio
	if err := h.DB.Where("id = ? AND user_id = ?", audioID, userID).First(&audio).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "音频文件不存在"})
		return
	}

	c.File(audio.FilePath)
}

// BatchDeleteTranscriptionTasks 批量删除转写任务
func (h *AudioHandler) BatchDeleteTranscriptionTasks(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		IDs []uint `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}

	result := h.DB.Where("id IN ? AND user_id = ?", req.IDs, userID).Delete(&models.TranscriptionTask{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "批量删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("成功删除 %d 个任务", result.RowsAffected)})
}
