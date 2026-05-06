# RIM - Reading Intelligence Manager

文章与播客智能提炼总结工具

## 项目简介

RIM 是一个基于 AI 的内容提炼工具，帮助用户高效提炼和总结文章、播客的核心观点。支持单篇或多篇内容输入，通过 AI 自动生成摘要、提取观点并进行交叉对比。

### 核心特性

- 📝 **多格式支持**: 文本、URL、PDF、Word、Markdown、音频文件
- 🤖 **多 AI 模型**: 支持 OpenAI、Claude、Gemini 等多种 AI 模型切换
- 🎙️ **播客转写**: 自动语音转文字，生成带时间戳的摘要
- 🔄 **交叉分析**: 多篇内容的观点对比和主题分析
- 💾 **知识管理**: 标签、文件夹、全文搜索
- 🌐 **多端支持**: Web、移动端、浏览器扩展

## 技术架构

### 微服务架构
- **Go 主服务**: 业务逻辑、数据库、API 网关
- **Python AI 服务**: AI 模型调用、异步任务处理

### 技术栈
- **后端**: Go (Gin) + Python (FastAPI)
- **数据库**: PostgreSQL + Redis
- **存储**: MinIO / S3
- **前端**: React + TypeScript + TailwindCSS
- **AI**: OpenAI GPT-4, Claude 3.5, Gemini Pro, Whisper

## 快速开始

### 前置要求
- Docker & Docker Compose
- (可选) Go 1.21+
- (可选) Python 3.11+
- (可选) Node.js 18+

### 使用 Docker 启动（推荐）

1. 克隆项目
```bash
git clone <repository-url>
cd rim
```

2. 配置环境变量（可选）
```bash
# 如果有 AI API Keys，可以配置
cp .env.example .env
# 编辑 .env 文件，添加你的 API Keys
```

3. 启动所有服务
```bash
docker-compose up -d
```

4. 访问应用
- 前端: http://localhost:3000
- Go API: http://localhost:8080
- Python AI API: http://localhost:8000
- MinIO Console: http://localhost:9001

5. 查看日志
```bash
docker-compose logs -f
```

### 本地开发

#### Go 主服务
```bash
cd backend-go
go mod download
go run cmd/server/main.go
```

#### Python AI 服务
```bash
cd backend-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Celery Worker
```bash
cd backend-python
celery -A app.tasks.celery_app worker --loglevel=info
```

#### 前端
```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
rim/
├── backend-go/          # Go 主服务
│   ├── cmd/            # 应用入口
│   ├── internal/       # 内部包
│   │   ├── api/       # API 处理器和路由
│   │   ├── models/    # 数据模型
│   │   ├── repository/# 数据访问层
│   │   └── service/   # 业务逻辑层
│   └── pkg/           # 可复用包
├── backend-python/      # Python AI 服务
│   ├── app/
│   │   ├── adapters/  # AI 模型适配器
│   │   ├── services/  # 业务服务
│   │   ├── tasks/     # Celery 任务
│   │   └── api/       # API 路由
│   └── requirements.txt
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
├── docs/                # 文档
├── scripts/             # 工具脚本
├── docker-compose.yml   # Docker 编排
├── CLAUDE.md           # Claude Code 开发指南
└── DEVELOPMENT_PLAN.md # 详细开发计划
```

## 开发计划

项目采用 MVP 方式分 8 个阶段开发：

- ✅ **阶段 0**: 项目规划和架构设计
- 🚧 **阶段 1**: 核心 MVP（用户系统 + 文本总结）
- ⏳ **阶段 2**: 文件支持与导出
- ⏳ **阶段 3**: 播客支持
- ⏳ **阶段 4**: 多内容分析
- ⏳ **阶段 5**: 知识管理增强
- ⏳ **阶段 6**: 分享与协作
- ⏳ **阶段 7**: 移动端与扩展
- ⏳ **阶段 8**: 高级功能

详细计划参见 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)

## AI 模型配置

### 支持的 AI 提供商
- **OpenAI**: GPT-4, GPT-4o, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus
- **Google**: Gemini Pro

### 配置方式
1. **系统级配置**: 在 `.env` 文件中配置默认 API Keys
2. **用户级配置**: 用户可在界面中配置自己的 API Keys（加密存储）

## API 文档

启动服务后访问：
- Go API 文档: http://localhost:8080/swagger/index.html
- Python AI API 文档: http://localhost:8000/docs

## 测试

### 运行测试
```bash
# Go 测试
cd backend-go
go test ./...

# Python 测试
cd backend-python
pytest

# 前端测试
cd frontend
npm test
```

## 部署

### 生产环境部署
```bash
# 构建生产镜像
docker-compose -f docker-compose.prod.yml build

# 启动生产服务
docker-compose -f docker-compose.prod.yml up -d
```

### 环境变量配置
生产环境必须配置的环境变量：
- `JWT_SECRET`: JWT 签名密钥（强随机字符串）
- `DB_PASSWORD`: 数据库密码
- `MINIO_SECRET_KEY`: MinIO 密钥

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链更新

## 许可证

[MIT License](LICENSE)

## 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 文档: [Documentation]

## 致谢

感谢以下开源项目：
- [Gin](https://github.com/gin-gonic/gin)
- [FastAPI](https://github.com/tiangolo/fastapi)
- [React](https://github.com/facebook/react)
- [OpenAI](https://openai.com/)
- [Anthropic](https://www.anthropic.com/)
