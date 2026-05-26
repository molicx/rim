# CLAUDE.md - RIM 项目开发指导

## 项目概述

文章与播客智能提炼总结工具 (RIM - Reading Intelligence Manager)
- 基于 AI 的内容提炼工具，支持文章和播客的智能总结、观点提取和交叉分析
- 采用 Go + Python 微服务架构
- 支持多 AI 模型切换（OpenAI/Claude/Gemini/DeepSeek/Qwen/Ollama 等）

## 项目结构

```
rim/
├── backend-go/          # Go 主服务
│   ├── cmd/server/      # 主程序入口
│   └── internal/        # handlers / models / middleware / utils
├── backend-python/      # Python AI 服务
│   ├── app/
│   │   ├── adapters/    # AI 模型适配器 / ASR 适配器
│   │   ├── services/    # 转写服务 / 播客解析 / 文件解析
│   │   ├── tasks/       # Celery 异步任务
│   │   └── main.py      # FastAPI 应用
│   └── requirements.txt
├── frontend/            # React 前端
│   ├── src/
│   │   ├── pages/       # Dashboard / SummaryDetail / TranscriptionDetail
│   │   ├── components/  # AudioPlayer / MindMap / PodcastLinkInput / ...
│   │   └── types/       # TypeScript 类型
│   └── package.json
├── docs/                # 文档
└── docker-compose.yml
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Go (Gin) + Python (FastAPI) |
| 前端 | React 18 + TypeScript + TailwindCSS |
| 数据库 | PostgreSQL + Redis |
| AI 模型 | OpenAI / Claude / Gemini / DeepSeek / Qwen / Whisper |

## 开发命令

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f [service-name]

# 停止服务
docker-compose down
```

### Go 服务
```bash
cd backend-go
go run cmd/server/main.go
go test ./...
```

### Python 服务
```bash
cd backend-python
uvicorn app.main:app --reload --port 8000
celery -A app.tasks.celery_app worker --loglevel=info
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 代码规范

### Go 代码规范
- 遵循 Go 标准项目布局（cmd, internal, pkg）
- 错误处理必须显式检查，不能忽略
- 使用依赖注入，避免全局变量
- 接口定义在使用方，不在实现方

### Python 代码规范
- 遵循 PEP 8 规范
- 使用 Type Hints
- 使用 Pydantic 进行数据验证
- 异步函数使用 async/await

### 前端代码规范
- 使用 TypeScript，禁止 any 类型
- 组件使用函数式组件 + Hooks
- 状态管理优先使用 Zustand
- API 调用使用 React Query

## 安全注意事项

1. **API Key 存储**: 用户的 API Key 必须使用 AES-256 加密后存储
2. **密码处理**: 使用 bcrypt 哈希，不存储明文密码
3. **JWT 过期**: 设置合理的过期时间（默认 24 小时）
4. **输入验证**: 所有用户输入必须验证和清理
5. **SQL 注入**: 使用 GORM 参数化查询，禁止字符串拼接

## 环境配置

### 必需的环境变量
- `JWT_SECRET`: JWT 签名密钥
- `DB_PASSWORD`: 数据库密码
- `ENCRYPTION_KEY`: AES-256 加密密钥（32 字节）

### AI API Keys（可选，用户可自行配置）
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`

## 数据库迁移

Go 服务使用 GORM AutoMigrate：
```go
db.AutoMigrate(
    &models.User{},
    &models.AIConfig{},
    &models.Summary{},
    &models.File{},
    &models.ASRConfig{},
    &models.Audio{},
    &models.TranscriptionTask{},
)
```

## 故障排查

### Go 服务无法启动
1. 检查数据库连接: `docker-compose logs postgres`
2. 检查环境变量是否正确配置
3. 查看 Go 服务日志: `docker-compose logs go-api`

### Python AI 服务调用失败
1. 检查 API Key 是否有效
2. 查看 Python 服务日志: `docker-compose logs python-ai`
3. 检查 Redis 连接: `docker-compose logs redis`

### Celery 任务不执行
1. 检查 Celery Worker 是否运行: `docker-compose ps celery-worker`
2. 查看 Worker 日志: `docker-compose logs celery-worker`
3. 检查 Redis 队列: `redis-cli -h localhost LLEN celery`

## 参考文档

- 项目状态: `PROJECT_STATUS.md`
- 开发计划: `DEVELOPMENT_PLAN.md`
- 自定义模型配置: `docs/CUSTOM_MODELS.md`
