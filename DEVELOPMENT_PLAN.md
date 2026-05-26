# 文章与播客智能提炼总结工具 - 开发计划

## 项目概述
一个基于 AI 的内容提炼工具，支持文章和播客的智能总结、观点提取和交叉分析。

## 技术栈选择

### 后端架构（微服务）

#### 主服务 - Go
- **框架**: Gin / Fiber - 高性能 HTTP 框架
- **功能职责**:
  - 用户认证与授权（JWT）
  - API 网关和路由
  - 数据库 CRUD 操作
  - 文件上传/下载管理
  - 业务逻辑处理
  - WebSocket 连接管理
- **数据库**: 
  - PostgreSQL - 主数据存储（使用 GORM）
  - Redis - 缓存、会话、任务队列
- **文件存储**: MinIO / AWS S3 SDK for Go
- **文本提取**: 
  - go-readability - 网页正文提取
  - unipdf - PDF 解析
  - docx 库 - Word 文档解析

#### AI 服务 - Python
- **框架**: FastAPI - 轻量级 AI 服务
- **功能职责**:
  - AI 模型调用封装（支持多模型切换）
  - 文本总结和分析
  - 语音转文字（ASR）
  - 向量嵌入和相似度计算
  - 观点提取和交叉分析
- **AI 模型支持**: 
  - OpenAI GPT-4 / GPT-4o
  - Anthropic Claude 3.5 Sonnet / Opus
  - Google Gemini Pro
  - 本地模型（Ollama）- 可选
  - Whisper / Faster-Whisper - 语音转文字
- **任务队列**: Celery + Redis - 处理长时间 AI 任务
- **依赖库**:
  - langchain - AI 应用框架
  - openai / anthropic / google-generativeai - 各厂商 SDK
  - faster-whisper - 高效 ASR
  - sentence-transformers - 文本向量化

#### 服务间通信
- **协议**: RESTful API（Go ↔ Python）
- **消息队列**: Redis（任务分发）
- **数据格式**: JSON

### 前端
- **框架**: React 18 + TypeScript
- **UI 库**: Ant Design / shadcn/ui
- **状态管理**: Zustand / React Query
- **路由**: React Router v6
- **构建工具**: Vite
- **样式**: TailwindCSS

### 部署与运维
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **监控**: Prometheus + Grafana (后期)

---

## MVP 开发路线图

### 阶段 1: 核心 MVP (2-3 周)
**目标**: 实现最基础的单篇文章总结功能

#### 功能范围
1. **用户系统**
   - 简单的邮箱注册/登录
   - JWT 认证
   - 访客模式（无需登录，限制使用次数）

2. **AI 模型配置**
   - 支持配置多个 AI 提供商（OpenAI/Claude/Gemini）
   - API Key 加密存储
   - 设置默认模型
   - 模型选择器（前端下拉菜单）
   - ✅ 编辑已有配置功能

3. **文章输入**
   - 直接粘贴纯文本
   - URL 抓取（支持常见网站）
   - 文本预处理和清洗

4. **AI 总结**
   - 要点式摘要（3-10 个核心要点）
   - 段落式摘要
   - 关键论点提取
   - 支持选择不同 AI 模型

5. **结果展示**
   - 原文-总结对照视图
   - 基础的文本高亮
   - 显示使用的 AI 模型信息

6. **历史记录**
   - 保存总结历史
   - 简单的列表查看
   - 按时间排序
   - 显示每条记录使用的模型
   - ✅ 删除历史记录功能

#### 技术实现
- **Go 主服务**: 
  - 用户认证和会话管理
  - 数据库操作（users, summaries 表）
  - 调用 Python AI 服务进行总结
- **Python AI 服务**: 
  - `/ai/summarize` 端点（支持模型选择参数）
  - 实现多模型适配器模式
  - 统一的输入输出格式
- **前端页面**: 登录页、主页（输入+结果）、历史页
- **模型配置**: 支持在前端选择 AI 模型（OpenAI/Claude/Gemini）

#### 交付物
- 可运行的 Web 应用（Go + Python 微服务）
- Docker Compose 部署配置
- API 文档（Swagger/OpenAPI）
- 支持 3 种 AI 模型的切换功能
- 基础的前端界面（React）

---

### 阶段 2: 文件支持与导出 (1-2 周) ✅ 完成
**目标**: 支持多种文件格式和导出功能

#### 新增功能
1. **文件上传** ✅
   - PDF 文件解析（PyMuPDF）
   - Word (.docx) 文件解析（python-docx）
   - Markdown (.md) 文件解析 ✅
   - TXT 文件支持 ✅
   - 拖拽上传界面 ✅
   - 上传进度显示 ✅

2. **导出功能** ✅
   - Markdown 导出（.md 附件下载）
   - PDF 导出（Python 生成）
   - 纯文本导出（.txt 附件下载）
   - 复制到剪贴板（Clipboard API）

3. **总结定制** ✅
   - 自定义总结长度（极简/标准/详细）
   - 选择总结风格（要点式/段落式/问答式）

4. **URL 提取器增强** ✅
   - 随机 User-Agent 轮换
   - 智能编码检测
   - 基于文本密度的内容提取
   - JS 渲染页面检测

#### 技术实现
- **Go 服务**: 文件上传处理、存储管理、导出 API ✅
- **Python 服务**: 文件解析、PDF 导出、prompt 动态生成 ✅
- 新增 API: `/api/v1/files/upload`, `/api/v1/files/summarize`, `/api/v1/summaries/:id/export` ✅

---

### 阶段 3: 播客支持 (2-3 周) 🚧 进行中
**目标**: 实现音频文件的转写和总结

#### 新增功能
1. **音频输入** ✅
   - 上传音频文件（mp3, mp4, wav, m4a, flac, ogg, aac）
   - 音频格式转换（ffmpeg）
   - 播客链接支持（通用 URL + RSS 订阅）

2. **语音转文字** ✅
   - 多方案 ASR 适配器（讯飞/阿里云/Whisper）
   - 生成带时间戳的逐字稿
   - Celery 异步处理队列
   - ASR 配置管理（CRUD + 加密存储）

3. **播客特有总结** ⏳ 待开发
   - 时间轴摘要
   - 点击时间戳跳转（前端播放器）

4. **进度追踪** ⏳ 待开发
   - 转写进度显示
   - 任务状态查询

#### 技术实现
- **Go 服务**: 音频文件上传、播客链接处理、任务调度 ✅
- **Python AI 服务**:
  - 多方案 ASR 适配器 ✅
  - 播客链接解析（podcast.py）✅
  - 音频预处理和格式转换（ffmpeg）
  - Celery 异步任务处理 ✅
- **通信**: Go 通过 HTTP 调用 Python 服务 ✅
- 音频播放器组件（React）⏳ 待开发

---

### 阶段 4: 多内容分析 (2 周)
**目标**: 支持多篇内容的批量处理和交叉分析

#### 新增功能
1. **批量输入**
   - 批量上传文件
   - 批量粘贴 URL
   - 创建项目/合集

2. **交叉分析**
   - 观点合并
   - 差异对比表格
   - 主题脉络图

3. **项目管理**
   - 创建/编辑/删除项目
   - 将多个总结归入项目
   - 项目级别的总结

#### 技术实现
- **Go 服务**: 项目管理 CRUD、批量任务调度
- **Python AI 服务**: 
  - 观点提取和向量化
  - 相似度计算（sentence-transformers）
  - 交叉分析算法
- 新增数据表: projects, project_items

---

### 阶段 5: 知识管理增强 (1-2 周)
**目标**: 完善历史记录管理和检索功能

#### 新增功能
1. **分类与检索**
   - 标签系统（手动+AI 推荐）
   - 文件夹管理
   - 全文搜索（Elasticsearch 或 PostgreSQL FTS）
   - 时间段筛选

2. **收藏与星标**
   - 星标重要总结
   - 收藏夹视图

3. **编辑与批注**
   - 手动编辑总结
   - 添加个人批注
   - 修订历史

#### 技术实现
- 标签系统数据表
- 搜索引擎集成
- 版本控制逻辑

---

### 阶段 6: 分享与协作 (1-2 周)
**目标**: 实现内容分享和基础协作功能

#### 新增功能
1. **分享功能**
   - 生成只读分享链接
   - 设置过期时间
   - 访问统计

2. **第三方集成**
   - Notion 导出
   - 社交媒体分享（Twitter, 微博）

3. **协作功能**（可选）
   - 项目共享
   - 多人批注
   - 评论功能

---

### 阶段 7: 移动端与扩展 (3-4 周)
**目标**: 开发移动应用和浏览器扩展

#### 新增功能
1. **移动端 App**
   - React Native / Flutter
   - 实时录音功能
   - 拍照 OCR（可选）
   - 推送通知

2. **浏览器扩展**
   - Chrome/Edge/Firefox 插件
   - 当前页面一键总结
   - 右键菜单快捷操作
   - 自动抓取正文

3. **数据同步**
   - 跨端实时同步
   - 离线模式支持

---

### 阶段 8: 高级功能 (按需开发)

#### 自动化功能
- RSS 自动总结
- 邮件摘要推送
- 播客更新通知

#### 开放平台
- RESTful API 开放
- Webhook 支持
- Zapier 集成

#### 智能助手
- 对话式交互
- 内容推荐系统

---

## 微服务架构设计

### 服务职责划分

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 (React)                         │
│                    Web / Mobile / Extension                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Go 主服务 (API Gateway)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  认证模块    │  │  业务逻辑    │  │  文件管理    │      │
│  │  JWT/OAuth   │  │  CRUD 操作   │  │  上传/下载   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             │ PostgreSQL                     │ Redis Queue
             ▼                                ▼
┌─────────────────────┐          ┌────────────────────────────┐
│   PostgreSQL DB     │          │   Python AI 服务 (FastAPI) │
│  - users            │          │  ┌──────────────────────┐  │
│  - summaries        │          │  │  模型适配器层        │  │
│  - projects         │          │  │  - OpenAI Adapter    │  │
│  - tags             │          │  │  - Claude Adapter    │  │
└─────────────────────┘          │  │  - Gemini Adapter    │  │
                                 │  └──────────────────────┘  │
┌─────────────────────┐          │  ┌──────────────────────┐  │
│   Redis             │◄─────────┤  │  AI 任务处理         │  │
│  - 缓存             │          │  │  - 文本总结          │  │
│  - 会话             │          │  │  - 语音转文字        │  │
│  - 任务队列         │          │  │  - 向量计算          │  │
└─────────────────────┘          │  └──────────────────────┘  │
                                 │  ┌──────────────────────┐  │
┌─────────────────────┐          │  │  Celery Worker       │  │
│   MinIO / S3        │◄─────────┤  │  - 异步任务队列      │  │
│  - 音频文件         │          │  │  - 长时间处理        │  │
│  - 文档文件         │          │  └──────────────────────┘  │
└─────────────────────┘          └────────────────────────────┘
```

### Go 主服务结构

```
backend-go/
├── cmd/
│   └── server/
│       └── main.go              # 入口文件
├── internal/
│   ├── api/
│   │   ├── handlers/            # HTTP 处理器
│   │   │   ├── auth.go
│   │   │   ├── summary.go
│   │   │   ├── project.go
│   │   │   └── file.go
│   │   ├── middleware/          # 中间件
│   │   │   ├── auth.go
│   │   │   ├── cors.go
│   │   │   └── logger.go
│   │   └── routes.go            # 路由定义
│   ├── models/                  # 数据模型
│   │   ├── user.go
│   │   ├── summary.go
│   │   └── project.go
│   ├── repository/              # 数据访问层
│   │   ├── user_repo.go
│   │   ├── summary_repo.go
│   │   └── project_repo.go
│   ├── service/                 # 业务逻辑层
│   │   ├── auth_service.go
│   │   ├── summary_service.go
│   │   ├── ai_client.go         # Python AI 服务客户端
│   │   └── storage_service.go
│   ├── config/                  # 配置管理
│   │   └── config.go
│   └── utils/                   # 工具函数
│       ├── jwt.go
│       └── validator.go
├── pkg/                         # 可复用包
│   ├── database/
│   │   └── postgres.go
│   ├── redis/
│   │   └── client.go
│   └── logger/
│       └── logger.go
├── go.mod
├── go.sum
└── Dockerfile
```

### Python AI 服务结构

```
backend-python/
├── app/
│   ├── main.py                  # FastAPI 入口
│   ├── config.py                # 配置
│   ├── models/                  # Pydantic 模型
│   │   ├── request.py
│   │   └── response.py
│   ├── adapters/                # AI 模型适配器
│   │   ├── base.py              # 抽象基类
│   │   ├── openai_adapter.py
│   │   ├── claude_adapter.py
│   │   ├── gemini_adapter.py
│   │   └── factory.py           # 工厂模式
│   ├── services/                # 业务服务
│   │   ├── summarizer.py        # 文本总结
│   │   ├── transcriber.py       # 语音转文字
│   │   ├── analyzer.py          # 交叉分析
│   │   └── embedder.py          # 向量嵌入
│   ├── tasks/                   # Celery 任务
│   │   ├── celery_app.py
│   │   ├── audio_tasks.py
│   │   └── analysis_tasks.py
│   ├── utils/                   # 工具函数
│   │   ├── text_processor.py
│   │   └── file_parser.py
│   └── api/                     # API 路由
│       ├── summarize.py
│       ├── transcribe.py
│       └── analyze.py
├── requirements.txt
├── Dockerfile
└── celery_worker.py             # Celery worker 入口
```

### AI 模型适配器设计

支持多模型切换的适配器模式：

```python
# base.py - 抽象基类
from abc import ABC, abstractmethod

class AIModelAdapter(ABC):
    @abstractmethod
    async def summarize(self, text: str, options: dict) -> dict:
        pass
    
    @abstractmethod
    async def extract_points(self, text: str) -> list:
        pass

# openai_adapter.py
class OpenAIAdapter(AIModelAdapter):
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
    
    async def summarize(self, text: str, options: dict) -> dict:
        # OpenAI 实现
        pass

# claude_adapter.py
class ClaudeAdapter(AIModelAdapter):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.client = Anthropic(api_key=api_key)
        self.model = model
    
    async def summarize(self, text: str, options: dict) -> dict:
        # Claude 实现
        pass

# factory.py - 工厂模式
class AIModelFactory:
    @staticmethod
    def create_adapter(provider: str, api_key: str, model: str = None):
        if provider == "openai":
            return OpenAIAdapter(api_key, model or "gpt-4")
        elif provider == "claude":
            return ClaudeAdapter(api_key, model or "claude-3-5-sonnet-20241022")
        elif provider == "gemini":
            return GeminiAdapter(api_key, model or "gemini-pro")
        else:
            raise ValueError(f"Unsupported provider: {provider}")
```

### 服务间通信流程

#### 同步调用（文本总结）
```
1. 前端 → Go API: POST /api/summarize/text
2. Go 验证请求、保存原文到数据库
3. Go → Python AI: POST http://ai-service:8000/ai/summarize
   {
     "text": "...",
     "provider": "claude",
     "model": "claude-3-5-sonnet-20241022",
     "options": {"length": "standard"}
   }
4. Python AI 调用对应模型、返回结果
5. Go 保存总结结果到数据库
6. Go → 前端: 返回完整结果
```

#### 异步调用（音频转写）
```
1. 前端 → Go API: POST /api/summarize/audio
2. Go 保存音频文件到 MinIO
3. Go → Redis: 推送任务到队列
   {
     "task_id": "uuid",
     "file_path": "s3://...",
     "user_id": 123
   }
4. Python Celery Worker 从队列获取任务
5. Worker 下载音频、调用 Whisper API
6. Worker 完成后通过 Redis 通知 Go
7. Go 通过 WebSocket 推送进度给前端
8. 前端轮询或接收 WebSocket 更新
```

### 配置管理

#### Go 配置 (config.yaml)
```yaml
server:
  port: 8080
  mode: debug

database:
  host: localhost
  port: 5432
  name: rim_db
  user: postgres
  password: password

redis:
  host: localhost
  port: 6379
  db: 0

ai_service:
  url: http://localhost:8000
  timeout: 300s

storage:
  type: minio  # or s3
  endpoint: localhost:9000
  access_key: minioadmin
  secret_key: minioadmin
  bucket: rim-files
```

#### Python 配置 (.env)
```env
# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Default Models
DEFAULT_PROVIDER=claude
DEFAULT_TEXT_MODEL=claude-3-5-sonnet-20241022
DEFAULT_AUDIO_MODEL=whisper-1

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Service
API_PORT=8000
```

---

## 数据库设计（初步）

### 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    username VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    preferred_ai_provider VARCHAR(50) DEFAULT 'openai', -- 'openai', 'claude', 'gemini'
    preferred_ai_model VARCHAR(100) -- 'gpt-4', 'claude-3-5-sonnet-20241022', etc.
);

-- AI 模型配置表
CREATE TABLE ai_model_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    provider VARCHAR(50) NOT NULL, -- 'openai', 'claude', 'gemini'
    api_key_encrypted TEXT, -- 加密存储的 API Key
    model_name VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 总结记录表
CREATE TABLE summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(500),
    content_type VARCHAR(50), -- 'article', 'podcast', 'document'
    source_url TEXT,
    source_file_path TEXT,
    original_text TEXT,
    summary_text TEXT,
    key_points JSONB,
    metadata JSONB, -- 存储时间戳、说话人等额外信息
    ai_provider VARCHAR(50), -- 记录使用的 AI 提供商
    ai_model VARCHAR(100), -- 记录使用的具体模型
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目/合集表
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目-总结关联表
CREATE TABLE project_summaries (
    project_id INTEGER REFERENCES projects(id),
    summary_id INTEGER REFERENCES summaries(id),
    PRIMARY KEY (project_id, summary_id)
);

-- 标签表
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    color VARCHAR(20)
);

-- 总结-标签关联表
CREATE TABLE summary_tags (
    summary_id INTEGER REFERENCES summaries(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (summary_id, tag_id)
);
```

---

## API 设计（核心端点）

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户信息

### AI 模型配置
- `GET /api/ai/models` - 获取支持的 AI 模型列表
- `POST /api/ai/config` - 添加 AI 模型配置（API Key）
- `GET /api/ai/config` - 获取用户的 AI 配置列表
- `PUT /api/ai/config/{id}` - 更新 AI 配置
- `DELETE /api/ai/config/{id}` - 删除 AI 配置
- `PUT /api/ai/config/{id}/default` - 设置默认模型

### 总结
- `POST /api/summarize/text` - 文本总结（支持 provider 和 model 参数）
- `POST /api/summarize/url` - URL 总结
- `POST /api/summarize/file` - 文件上传总结
- `POST /api/summarize/audio` - 音频转写总结
- `GET /api/summarize/{id}` - 获取总结详情
- `PUT /api/summarize/{id}` - 更新总结
- `DELETE /api/summarize/{id}` - 删除总结

### 历史与管理
- `GET /api/summaries` - 获取总结列表（支持分页、筛选）
- `GET /api/summaries/search` - 搜索总结

### 项目
- `POST /api/projects` - 创建项目
- `GET /api/projects` - 获取项目列表
- `GET /api/projects/{id}` - 获取项目详情
- `POST /api/projects/{id}/analyze` - 项目交叉分析

### 导出与分享
- `GET /api/export/{id}` - 导出总结（支持格式参数）
- `POST /api/share/{id}` - 创建分享链接
- `GET /api/shared/{token}` - 访问分享内容

---

## 环境配置

### Go 服务环境变量 (.env)
```bash
# 服务配置
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
GIN_MODE=release

# 数据库
DB_HOST=postgres
DB_PORT=5432
DB_USER=rim_user
DB_PASSWORD=your_password
DB_NAME=rim_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=24h

# Python AI 服务
AI_SERVICE_URL=http://python-ai:8000

# 文件存储
STORAGE_TYPE=minio  # minio, s3, local
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=rim-files

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Python AI 服务环境变量 (.env)
```bash
# 服务配置
API_PORT=8000
API_HOST=0.0.0.0

# Redis (Celery)
REDIS_URL=redis://redis:6379/0

# AI 模型 API Keys（系统默认，用户可自定义）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Whisper 配置
WHISPER_MODEL=base  # tiny, base, small, medium, large
WHISPER_DEVICE=cpu  # cpu, cuda

# 模型配置
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

---

## Docker Compose 配置

```yaml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: rim_user
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: rim_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # MinIO (对象存储)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  # Go 主服务
  go-api:
    build:
      context: ./backend-go
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    env_file:
      - ./backend-go/.env
    depends_on:
      - postgres
      - redis
      - python-ai
    volumes:
      - ./backend-go:/app

  # Python AI 服务
  python-ai:
    build:
      context: ./backend-python
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ./backend-python/.env
    depends_on:
      - redis
    volumes:
      - ./backend-python:/app

  # Celery Worker
  celery-worker:
    build:
      context: ./backend-python
      dockerfile: Dockerfile
    command: celery -A app.tasks.celery_app worker --loglevel=info
    env_file:
      - ./backend-python/.env
    depends_on:
      - redis
      - python-ai
    volumes:
      - ./backend-python:/app

  # 前端
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
    depends_on:
      - go-api
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 开发优先级建议

### 立即开始（阶段 1）
1. 搭建项目基础架构
2. 实现用户认证系统
3. 开发文本总结核心功能
4. 创建基础 UI 界面

### 短期目标（阶段 2-3）
1. 文件格式支持
2. 导出功能
3. 播客转写功能

### 中期目标（阶段 4-6）
1. 多内容分析
2. 知识管理
3. 分享协作

### 长期目标（阶段 7-8）
1. 移动端开发
2. 浏览器扩展
3. 自动化和开放平台

---

## 成本估算（月度）

### 开发阶段
- AI API 调用（OpenAI/Claude）: $50-200
- 服务器（开发环境）: $20-50
- 存储: $10-20

### 生产阶段（小规模）
- AI API 调用: $200-1000（取决于用户量）
- 服务器（2-4 核）: $50-100
- 数据库: $20-50
- 存储（100GB-1TB）: $20-50
- CDN: $10-30

---

## 风险与注意事项

1. **AI API 成本**: 需要实现缓存机制，避免重复调用
2. **音频处理**: 大文件处理耗时，需要良好的队列管理
3. **并发处理**: 使用异步任务队列处理耗时操作
4. **数据隐私**: 用户内容加密存储，符合 GDPR
5. **扩展性**: 设计时考虑水平扩展能力

---

## 下一步行动

请审阅此开发计划，确认：
1. 技术栈选择是否合适
2. MVP 功能范围是否合理
3. 开发阶段划分是否清晰
4. 是否有需要调整的优先级

确认后，我将开始搭建项目基础架构并实现阶段 1 的功能。
