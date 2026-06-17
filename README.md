# RIM - 文章与播客智能提炼总结工具

> ⚠️ **项目状态：已彻底放弃** ⚠️
>
> **放弃日期**: 2026-06-17
>
> **放弃原因**:
> 1. **商业模式不清晰**: 目标用户（普通用户）付费意愿低，没有找到可持续的盈利模式
> 2. **缺乏差异化优势**: 与竞品（Notion AI、Readwise等）相比没有明显优势，缺乏护城河
> 3. **竞争激烈**: 市场上已有成熟的类似产品，且核心功能（文章总结）技术壁垒不高
> 4. **成本问题**: 音频处理、API调用等运营成本高，但用户付费意愿低
>
> **后续不再更新本项目。**

---

> 基于 AI 的内容提炼工具，支持文章和播客的智能总结、观点提取和交叉分析。

## 功能特性

- ✅ **文章总结** - 文本粘贴 / URL 抓取 / 文件上传（PDF/Word/TXT/MD）
- ✅ **AI 模型配置** - 支持 OpenAI/Claude/Gemini/DeepSeek/Qwen/Ollama 等
- ✅ **总结定制** - 长度（极简/标准/详细）+ 风格（要点式/段落式/问答式）
- ✅ **思维导图** - 基于 react-flow 的可视化展示
- ✅ **导出功能** - Markdown / PDF / 纯文本 / 复制到剪贴板
- ✅ **音频转写** - 上传音频或输入播客链接，自动转写为文字
- ✅ **多方案 ASR** - 讯飞 / 阿里云 / OpenAI Whisper，可配置切换
- ✅ **播客链接** - 通用 URL 直链 + RSS 订阅解析
- ✅ **音频播放器** - 时间轴片段跳转、播放速度调节

## 快速开始

### 前置要求

- Docker 和 Docker Compose

### 启动项目

```bash
# 1. 克隆项目
cd rim

# 2. 复制环境变量文件
cp .env.example .env

# 3. 启动所有服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost:5173
# API: http://localhost:3000
```

## 使用指南

### 1. 注册账号

访问 http://localhost:5173/register 注册新账号

### 2. 配置 AI 模型

点击右上角"AI 配置"按钮：
- **预设模型**：OpenAI / Claude / Gemini
- **自定义模型**：DeepSeek / Qwen / Ollama 等 OpenAI 兼容接口

### 3. 创建总结

Dashboard 有三个 Tab：
- **文章总结** - 文本 / URL / 文件输入
- **音频转写** - 上传音频文件
- **播客链接** - 输入 RSS 订阅或音频直链

### 4. 查看历史

右侧面板显示：
- **转写任务** - 所有音频转写任务及状态
- **总结历史** - 所有已完成的总结

## 项目结构

```
rim/
├── backend-go/          # Go 主服务 (Port 3000)
│   ├── cmd/server/      # 主程序入口
│   └── internal/        # handlers / models / middleware / utils
├── backend-python/      # Python AI 服务 (Port 8000)
│   ├── app/
│   │   ├── adapters/    # AI 模型适配器 / ASR 适配器
│   │   ├── services/    # 转写服务 / 播客解析 / 文件解析
│   │   └── main.py      # FastAPI 应用
│   └── requirements.txt
├── frontend/            # React 前端 (Port 5173)
│   ├── src/
│   │   ├── pages/       # Dashboard / SummaryDetail / TranscriptionDetail
│   │   ├── components/  # AudioPlayer / MindMap / PodcastLinkInput / ...
│   │   └── types/       # TypeScript 类型定义
│   └── package.json
├── docs/                # 文档
│   └── CUSTOM_MODELS.md # 自定义模型配置指南
├── scripts/             # 工具脚本
└── docker-compose.yml   # Docker 编排
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Go (Gin) + Python (FastAPI) |
| 前端 | React 18 + TypeScript + TailwindCSS |
| 数据库 | PostgreSQL + Redis |
| AI 模型 | OpenAI / Claude / Gemini / DeepSeek / Qwen / Whisper |
| 部署 | Docker Compose |

## API 文档

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录

### 总结
- `POST /api/v1/summaries` - 创建总结
- `GET /api/v1/summaries` - 获取列表
- `GET /api/v1/summaries/:id` - 获取详情
- `GET /api/v1/summaries/:id/export?format=markdown|text|pdf` - 导出

### 音频
- `POST /api/v1/audio/upload` - 上传音频
- `POST /api/v1/audio/transcribe` - 提交转写任务
- `POST /api/v1/audio/podcast` - 处理播客链接
- `GET /api/v1/audio/transcriptions` - 转写任务列表
- `GET /api/v1/audio/transcriptions/:id` - 任务状态

### 文件
- `POST /api/v1/files/upload` - 上传文件
- `POST /api/v1/files/summarize` - 文件总结

## 开发命令

```bash
# 查看日志
docker-compose logs -f [service-name]

# 重启服务
docker-compose restart [service-name]

# 停止所有服务
docker-compose down

# 清理数据（重置数据库）
docker-compose down -v && docker-compose up -d
```

## 项目状态

**已放弃** - 详见 [PROJECT_STATUS.md](PROJECT_STATUS.md)

## 开发计划

详见 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)

## 自定义模型配置

详见 [docs/CUSTOM_MODELS.md](docs/CUSTOM_MODELS.md)

## 许可证

MIT License
