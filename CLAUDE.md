# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

文章与播客智能提炼总结工具 (RIM - Reading Intelligence Manager)
- 基于 AI 的内容提炼工具，支持文章和播客的智能总结、观点提取和交叉分析
- 采用 Go + Python 微服务架构
- 支持多 AI 模型切换（OpenAI/Claude/Gemini + 自定义模型）
- **新增**: 支持任何 OpenAI 兼容接口（DeepSeek, Qwen, Ollama 等）

## 项目结构

```
rim/
├── backend-go/          # Go 主服务（业务逻辑、数据库、API 网关）
├── backend-python/      # Python AI 服务（模型调用、异步任务）
├── frontend/            # React 前端
├── docs/                # 文档
├── scripts/             # 部署和工具脚本
└── docker-compose.yml   # Docker 编排配置
```

## 技术栈

### 后端
- **Go 主服务**: Gin 框架, GORM, JWT 认证
- **Python AI 服务**: FastAPI, Celery, LangChain
- **数据库**: PostgreSQL (主数据), Redis (缓存/队列)
- **存储**: MinIO / S3
- **AI 模型**: OpenAI GPT-4, Claude 3.5, Gemini Pro, Whisper
- **自定义模型**: 支持 OpenAI 兼容接口（DeepSeek, Qwen, Ollama, 智谱 AI 等）

### 前端
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **UI**: TailwindCSS + shadcn/ui
- **状态**: Zustand + React Query

## 开发命令

### 启动开发环境
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f [service-name]

# 停止服务
docker-compose down
```

### Go 服务开发
```bash
cd backend-go

# 安装依赖
go mod download

# 运行服务
go run cmd/server/main.go

# 运行测试
go test ./...

# 代码格式化
go fmt ./...

# 代码检查
golangci-lint run
```

### Python AI 服务开发
```bash
cd backend-python

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 运行服务
uvicorn app.main:app --reload --port 8000

# 运行 Celery Worker
celery -A app.tasks.celery_app worker --loglevel=info

# 运行测试
pytest

# 代码格式化
black .
isort .

# 类型检查
mypy .
```

### 前端开发
```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

## 架构原则

### 服务职责划分
1. **Go 主服务**负责:
   - 用户认证和授权
   - 数据库 CRUD 操作
   - 文件上传/下载管理
   - API 网关和路由
   - WebSocket 连接管理
   - 业务逻辑编排

2. **Python AI 服务**负责:
   - AI 模型调用（通过适配器模式）
   - 文本总结和分析
   - 语音转文字（Whisper）
   - 向量嵌入和相似度计算
   - 异步任务处理（Celery）

### 服务通信
- Go → Python: HTTP RESTful API
- 异步任务: Redis 队列 + Celery
- 实时通信: WebSocket (Go 服务)

### 数据库访问
- 只有 Go 服务直接访问 PostgreSQL
- Python 服务通过 Go API 获取/存储数据
- Redis 可被两个服务共享使用

## 代码规范

### Go 代码规范
- 使用标准的 Go 项目布局（cmd, internal, pkg）
- 错误处理必须显式检查，不能忽略
- 使用依赖注入，避免全局变量
- 接口定义在使用方，不在实现方
- 单元测试覆盖率 > 70%
- 使用 context.Context 传递请求上下文
- 敏感信息（密码、API Key）必须加密存储

### Python 代码规范
- 遵循 PEP 8 规范
- 使用 Type Hints
- 使用 Pydantic 进行数据验证
- 异步函数使用 async/await
- 所有 AI 模型调用必须通过适配器
- 长时间任务必须使用 Celery 异步处理
- 单元测试使用 pytest

### 前端代码规范
- 使用 TypeScript，禁止 any 类型
- 组件使用函数式组件 + Hooks
- 状态管理优先使用 Zustand
- API 调用使用 React Query
- 样式使用 TailwindCSS，避免内联样式
- 组件必须有 PropTypes 或 TypeScript 类型定义

## AI 模型适配器

### 支持的模型类型

1. **原生适配器** (provider_type: "native")
   - OpenAI: GPT-4, GPT-4o, GPT-3.5-turbo
   - Claude: Claude 3.5 Sonnet, Claude 3 Opus
   - Gemini: Gemini Pro, Gemini Pro Vision

2. **通用适配器** (provider_type: "openai_compatible")
   - 支持任何 OpenAI 兼容接口
   - 示例: DeepSeek, Qwen, Ollama, 智谱 AI
   - 使用 `GenericOpenAIAdapter`

### 添加新的原生模型

在 `backend-python/app/adapters/` 中创建新适配器：

```python
from .base import AIModelAdapter

class NewModelAdapter(AIModelAdapter):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def summarize(self, text: str, options: dict) -> dict:
        # 实现总结逻辑
        pass
    
    async def extract_points(self, text: str) -> list:
        # 实现观点提取逻辑
        pass
```

然后在 `factory.py` 中注册：
```python
def create_adapter(
    provider: str,
    api_key: str,
    model: str = None,
    provider_type: str = "native",
    base_url: str = None
):
    if provider == "new_model":
        return NewModelAdapter(api_key, model)
    # ...
```

### 使用自定义模型（OpenAI 兼容）

用户无需修改代码，直接在前端配置：
1. 选择"自定义模型"
2. 填写 provider 名称（如 deepseek）
3. 填写 model 名称（如 deepseek-chat）
4. 填写 base_url（如 https://api.deepseek.com/v1）
5. 填写 API Key

系统自动使用 `GenericOpenAIAdapter` 处理。

详细配置指南: `docs/CUSTOM_MODELS.md`
    if provider == "new_model":
        return NewModelAdapter(api_key, model)
    # ...
```

## 数据库迁移

### Go 服务使用 GORM AutoMigrate
```go
// 在 main.go 或初始化代码中
db.AutoMigrate(&models.User{}, &models.Summary{}, &models.Project{})
```

### 手动迁移脚本
```bash
# 创建迁移脚本
cd backend-go/migrations
# 编辑 SQL 文件

# 执行迁移
psql -h localhost -U rim_user -d rim_db -f migrations/001_initial.sql
```

## 环境变量

### 必需的环境变量
- `JWT_SECRET`: JWT 签名密钥
- `DB_PASSWORD`: 数据库密码
- `REDIS_PASSWORD`: Redis 密码（如果设置）
- `MINIO_SECRET_KEY`: MinIO 密钥

### AI API Keys（可选，用户可自行配置）
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`

## 安全注意事项

1. **API Key 存储**: 用户的 API Key 必须使用 AES-256 加密后存储在数据库
2. **密码处理**: 使用 bcrypt 哈希，不存储明文密码
3. **JWT 过期**: 设置合理的过期时间（默认 24 小时）
4. **输入验证**: 所有用户输入必须验证和清理
5. **SQL 注入**: 使用 GORM 参数化查询，禁止字符串拼接
6. **XSS 防护**: 前端渲染用户内容时必须转义
7. **CORS**: 生产环境严格限制允许的源
8. **速率限制**: API 必须实现速率限制防止滥用

## 测试策略

### 单元测试
- Go: 使用 `testing` 包，mock 外部依赖
- Python: 使用 `pytest`，mock AI API 调用
- 前端: 使用 `vitest` + `@testing-library/react`

### 集成测试
- 使用 Docker Compose 启动测试环境
- 测试服务间通信
- 测试数据库操作

### E2E 测试（后期）
- 使用 Playwright 或 Cypress
- 测试关键用户流程

## 部署流程

### 开发环境
```bash
docker-compose up -d
```

### 生产环境
1. 构建镜像
```bash
docker-compose -f docker-compose.prod.yml build
```

2. 推送到镜像仓库
```bash
docker-compose -f docker-compose.prod.yml push
```

3. 在服务器上拉取并启动
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 性能优化

1. **缓存策略**:
   - 相同文本的总结结果缓存 24 小时
   - 用户信息缓存 1 小时
   - 使用 Redis 作为缓存层

2. **数据库优化**:
   - 为常用查询字段添加索引
   - 使用连接池
   - 大文本字段考虑分表存储

3. **AI 调用优化**:
   - 批量请求合并
   - 使用流式响应（SSE）
   - 实现请求队列避免并发过高

4. **文件处理**:
   - 大文件分块上传
   - 音频文件压缩后存储
   - 使用 CDN 加速静态资源

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

### 前端无法连接后端
1. 检查 CORS 配置
2. 确认 API URL 配置正确
3. 查看浏览器控制台错误信息

## 开发工作流

### 功能开发流程
1. 在 `DEVELOPMENT_PLAN.md` 中确认功能需求
2. 创建功能分支: `git checkout -b feature/xxx`
3. 按照 MVP 阶段顺序开发
4. 编写单元测试
5. 本地测试通过后提交代码
6. 合并到主分支

### 代码提交规范
```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建/工具链更新
```

## MVP 开发阶段

当前处于 **阶段 1**: 核心 MVP 开发

### 阶段 1 任务清单
- [ ] 搭建 Go 主服务基础架构
- [ ] 搭建 Python AI 服务基础架构
- [ ] 实现用户注册/登录
- [ ] 实现 AI 模型配置管理
- [ ] 实现文本总结功能（支持多模型）
- [ ] 实现 URL 抓取功能
- [ ] 实现历史记录管理
- [ ] 开发前端基础界面
- [ ] 配置 Docker Compose
- [ ] 编写 API 文档

详细开发计划参见 `DEVELOPMENT_PLAN.md`

## 参考文档

- 完整开发计划: `DEVELOPMENT_PLAN.md`
- 架构说明: `架构说明.md`
- 功能需求: `readme.md`
- API 文档: 启动服务后访问 `/docs` (Swagger UI)

## 注意事项

1. **不要跳过阶段**: 严格按照 MVP 阶段顺序开发，确保每个阶段完成后再进入下一阶段
2. **代码复用**: Go 和 Python 服务中的通用逻辑应该抽取为独立的包/模块
3. **错误处理**: 所有外部调用（数据库、AI API、文件操作）必须有完善的错误处理
4. **日志记录**: 关键操作必须记录日志，便于排查问题
5. **配置管理**: 敏感配置使用环境变量，不要硬编码
6. **API 版本**: API 路径包含版本号，如 `/api/v1/...`
7. **文档同步**: 代码变更时同步更新相关文档
