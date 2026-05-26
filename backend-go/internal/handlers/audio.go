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

	// 提交到 Celery 异步处理
	go h.submitTranscriptionTask(task.ID, audio.FilePath, req.Provider, decryptedKey, decryptedSecret, config)

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

	c.JSON(http.StatusOK, gin.H{
		"id":         task.ID,
		"status":     task.Status,
		"title":      task.Title,
		"provider":   task.Provider,
		"text":       task.Result,
		"segments":   task.Segments,
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

// submitTranscriptionTask 提交转写任务到 Python 服务
func (h *AudioHandler) submitTranscriptionTask(taskID uint, audioPath, provider string, apiKey string, apiSecret string, config models.ASRConfig) {
	// 调用 Python 服务进行转写
	type TranscribeRequest struct {
		TaskID   uint                   `json:"task_id"`
		Audio    string                 `json:"audio_path"`
		Provider string                `json:"provider"`
		Config   map[string]interface{} `json:"config"`
	}

	providerConfig := map[string]interface{}{
		"api_key": apiKey,
	}

	// 根据提供商添加额外配置
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
		providerConfig["access_key_id"] = config.AccessKeyID
		providerConfig["app_key"] = config.AppKey
	}

	reqBody, _ := json.Marshal(TranscribeRequest{
		TaskID:   taskID,
		Audio:    audioPath,
		Provider: provider,
		Config:   providerConfig,
	})

	resp, err := http.Post(
		h.PythonAIURL+"/api/v1/transcribe",
		"application/json",
		bytes.NewBuffer(reqBody),
	)
	if err != nil {
		// 更新任务状态为失败
		h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", taskID).Update("status", "failed")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", taskID).Update("status", "failed")
		return
	}

	// 更新任务状态为处理中
	h.DB.Model(&models.TranscriptionTask{}).Where("id = ?", taskID).Update("status", "processing")
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
