# RIM - 文章与播客智能提炼总结工具

## 阶段2: 文件上传功能开发中 🚧

### 已实现功能

- ✅ 用户注册/登录系统（JWT 认证）
- ✅ AI 模型配置管理（支持 OpenAI/Claude/Gemini + 自定义模型）
- ✅ 文本总结功能（直接粘贴）
- ✅ URL 抓取功能
- ✅ 历史记录管理
- ✅ 前端界面（React + TypeScript）
- ✅ Docker 容器化部署
- ✅ **自定义模型支持**（DeepSeek/Qwen/Ollama 等 OpenAI 兼容接口）
- ✅ **文件上传功能**（PDF/Word/TXT/Markdown）
- ✅ **文件解析服务**（PyMuPDF + python-docx）

## 快速开始

### 前置要求

- Docker 和 Docker Compose
- （可选）至少一个 AI 服务的 API Key（OpenAI/Claude/Gemini）

### 启动项目

1. 克隆项目并进入目录
```bash
cd rim
```

2. 复制环境变量文件
```bash
cp .env.example .env
```

3. （可选）编辑 `.env` 文件，添加你的 AI API Key
```bash
# 可选：在这里配置默认的 API Key
# 用户也可以在界面中配置自己的 Key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key
GOOGLE_API_KEY=your_gemini_key
```

4. 启动所有服务
```bash
docker-compose up -d
```

5. 等待服务启动（约 30 秒）
```bash
docker-compose logs -f
```

6. 访问应用
- 前端界面: http://localhost:5173
- Go API: http://localhost:3000
- Python AI 服务: http://localhost:8000

### 验证功能

运行验证脚本测试所有功能：

**Linux/Mac:**
```bash
chmod +x scripts/validate.sh
./scripts/validate.sh
```

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate.ps1
```

## 使用指南

### 1. 注册账号

访问 http://localhost:5173/register 注册新账号

### 2. 配置 AI 模型

登录后，点击右上角"AI 配置"按钮：

#### 预设模型
- 选择 AI 提供商（OpenAI/Claude/Gemini）
- 选择模型
- 输入 API Key
- 设置为默认配置

#### 自定义模型（新功能）
支持任何 OpenAI 兼容的 API 接口：
- **DeepSeek**: deepseek-chat
- **通义千问**: qwen-turbo
- **Ollama**: 本地模型
- **智谱 AI**: glm-4
- 其他兼容接口

详细配置指南参见 [docs/CUSTOM_MODELS.md](docs/CUSTOM_MODELS.md)

### 3. 创建总结

支持三种输入方式：
- **文本输入**: 直接粘贴文章内容
- **URL 输入**: 输入网页链接，自动抓取正文
- **文件上传**: 上传 PDF、Word、TXT、Markdown 文件（最大 10MB）

点击"生成总结"或"解析文件并生成总结"，等待 AI 处理完成。

### 4. 查看历史

右侧面板显示所有历史总结记录，点击可查看详情。

## 项目结构

```
rim/
├── backend-go/          # Go 主服务
│   ├── cmd/server/      # 主程序入口
│   ├── internal/        # 内部包
│   │   ├── models/      # 数据模型
│   │   ├── handlers/    # HTTP 处理器
│   │   ├── middleware/  # 中间件
│   │   ├── config/      # 配置
│   │   └── utils/       # 工具函数
│   └── Dockerfile
├── backend-python/      # Python AI 服务
│   ├── app/
│   │   ├── adapters/    # AI 模型适配器
│   │   ├── main.py      # FastAPI 应用
│   │   └── ...
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/            # React 前端
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── services/    # API 服务
│   │   ├── store/       # 状态管理
│   │   └── types/       # TypeScript 类型
│   ├── package.json
│   └── Dockerfile.dev
├── scripts/             # 工具脚本
│   ├── validate.sh      # Linux/Mac 验证脚本
│   └── validate.ps1     # Windows 验证脚本
└── docker-compose.yml   # Docker 编排
```

## 技术栈

### 后端
- **Go**: Gin 框架, GORM, JWT 认证
- **Python**: FastAPI, 多 AI 模型适配器
- **数据库**: PostgreSQL
- **缓存**: Redis

### 前端
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **UI**: TailwindCSS
- **状态**: Zustand

### AI 模型
- OpenAI GPT-4 / GPT-4o / GPT-3.5-turbo
- Anthropic Claude 3.5 Sonnet / Claude 3 Opus
- Google Gemini Pro
- **自定义模型**: 支持任何 OpenAI 兼容接口（DeepSeek, Qwen, Ollama, 智谱 AI 等）

## API 文档

### 认证接口

**注册**
```
POST /api/v1/auth/register
Body: { "email": "user@example.com", "password": "password", "name": "Name" }
```

**登录**
```
POST /api/v1/auth/login
Body: { "email": "user@example.com", "password": "password" }
```

### AI 配置接口

**创建配置**
```
POST /api/v1/ai-configs
Headers: Authorization: Bearer <token>
Body: {
  "provider": "openai",
  "model": "gpt-4",
  "api_key": "sk-...",
  "is_default": true
}

# 自定义模型示例
Body: {
  "provider": "deepseek",
  "provider_type": "openai_compatible",
  "model": "deepseek-chat",
  "base_url": "https://api.deepseek.com/v1",
  "api_key": "sk-...",
  "is_default": false
}
```

**获取配置列表**
```
GET /api/v1/ai-configs
Headers: Authorization: Bearer <token>
```

### 总结接口

**创建总结**
```
POST /api/v1/summaries
Headers: Authorization: Bearer <token>
Body: { "text": "...", "title": "标题", "config_id": 1 }
或
Body: { "url": "https://...", "title": "标题", "config_id": 1 }
```

**获取总结列表**
```
GET /api/v1/summaries
Headers: Authorization: Bearer <token>
```

**获取单个总结**
```
GET /api/v1/summaries/:id
Headers: Authorization: Bearer <token>
```

### 文件 API

**上传文件**
```
POST /api/v1/files/upload
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file=<文件>, title=标题
```

**文件总结**
```
POST /api/v1/files/summarize
Headers: Authorization: Bearer <token>
Body: { "file_id": 1, "title": "标题", "config_id": 1 }
```

## 常见问题

### 1. 服务启动失败

检查端口是否被占用：
- 3000 (Go API)
- 5173 (前端)
- 8000 (Python AI)
- 5432 (PostgreSQL)
- 6379 (Redis)

### 2. AI 总结失败

确保：
- 已配置有效的 AI API Key
- API Key 有足够的额度
- 网络可以访问 AI 服务

### 3. URL 抓取失败

某些网站可能：
- 需要登录
- 有反爬虫机制
- 使用 JavaScript 渲染内容

建议直接复制文本内容进行总结。

## 开发命令

### 查看日志
```bash
docker-compose logs -f [service-name]
```

### 重启服务
```bash
docker-compose restart [service-name]
```

### 停止所有服务
```bash
docker-compose down
```

### 清理数据（重置数据库）
```bash
docker-compose down -v
docker-compose up -d
```

## 下一步开发

参见 `DEVELOPMENT_PLAN.md` 中的阶段 2-8 规划：
- 阶段 2: 文件上传和解析
- 阶段 3: 播客音频处理
- 阶段 4: 多内容交叉分析
- 阶段 5: 导出和分享
- 阶段 6: 知识管理
- 阶段 7: 移动端和浏览器扩展
- 阶段 8: 高级功能

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
