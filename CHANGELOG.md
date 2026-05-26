# RIM 更新日志

## v3.0.0-alpha (2026-05-27)

### 阶段3: 播客支持 - 全部完成

**新增功能:**
- 音频文件上传（mp3/mp4/wav/m4a/flac/ogg/aac）
- 播客链接解析（通用 URL + RSS 订阅）
- 多方案 ASR 配置（讯飞/阿里云/Whisper）
- 语音转文字（Celery 异步任务）
- 音频播放器（时间轴跳转、播放速度调节）
- 转写结果展示页（`/transcription/:id`）
- 转写任务列表（Dashboard 右侧面板）
- 转写进度实时追踪

---

## v2.0.0-alpha (2026-05-23)

### 阶段2: 文件支持与导出 - 全部完成

**新增功能:**
- 文件上传（PDF/Word/TXT/Markdown）
- 文件解析（PyMuPDF + python-docx）
- 总结定制（长度/风格选择）
- 导出功能（Markdown/TXT/PDF/复制）
- URL 提取器增强（反爬虫/智能提取）
- 思维导图（react-flow）
- 前端 UI 美化（简约现代风格）
- 多方案 ASR 配置管理
- 历史记录删除功能
- AI 配置编辑功能

---

## v1.0.0-alpha (2026-04-28)

### 阶段1: 核心 MVP - 完成

**功能:**
- 用户注册/登录（JWT 认证）
- AI 模型配置（OpenAI/Claude/Gemini + 自定义）
- 文本/URL 总结
- 历史记录管理
- Docker 容器化部署
