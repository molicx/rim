# RIM 快速启动指南

## 5 分钟快速开始

### 前置要求

- Docker 和 Docker Compose 已安装
- 至少一个 AI 服务的 API Key（OpenAI/Claude/Gemini 或其他 OpenAI 兼容服务）

### 步骤 1: 启动服务

**使用 Docker Compose:**
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

**预期输出：**
```
NAME                IMAGE                    STATUS
rim-postgres        postgres:15-alpine       Up (healthy)
rim-redis           redis:7-alpine           Up (healthy)
rim-minio           minio/minio:latest       Up (healthy)
rim-go-api          rim-go-api               Up
rim-python-ai       rim-python-ai            Up
rim-celery-worker   rim-python-ai            Up
rim-frontend        rim-frontend             Up
```

### 步骤 2: 等待服务就绪

首次启动需要约 30-60 秒，等待所有容器启动完成。

**查看启动日志：**
```bash
docker-compose logs -f
```

**确认服务就绪：**
- Go API: `Server starting on port 3000`
- Python AI: `Uvicorn running on http://0.0.0.0:8000`
- Celery Worker: `celery@xxx ready.`
- Frontend: `VITE v5.x.x ready`

### 步骤 3: 访问应用

打开浏览器访问：**http://localhost:5173**

### 步骤 4: 注册账号

1. 点击页面上的"注册"按钮
2. 填写注册信息：
   - **姓名**（可选）
   - **邮箱**（必填，用于登录）
   - **密码**（必填，至少 6 位）
3. 点击"注册"按钮
4. 注册成功后自动登录并跳转到主页

### 步骤 5: 配置 AI 模型

登录后，首先需要配置至少一个 AI 模型才能使用总结功能。

#### 方式 1: 使用预设模型（推荐）

1. 点击右上角"AI 配置"按钮
2. 在弹出的配置窗口中，选择"**预设模型**"
3. 选择 AI 提供商：
   - **OpenAI**: GPT-4, GPT-4o, GPT-3.5-turbo
   - **Claude**: Claude 3.5 Sonnet, Claude 3 Opus
   - **Gemini**: Gemini Pro, Gemini Pro Vision
4. 选择具体模型
5. 输入对应的 **API Key**
6. 勾选"**设为默认配置**"（推荐）
7. 点击"添加配置"

#### 方式 2: 使用自定义模型（高级）

支持任何 OpenAI 兼容的 API 接口，例如：
- DeepSeek
- Qwen (通义千问)
- Ollama (本地部署)
- 智谱 AI (GLM)
- 月之暗面 (Moonshot)
- 其他兼容 OpenAI API 格式的服务

**配置步骤：**
1. 点击右上角"AI 配置"按钮
2. 选择"**自定义模型**"
3. 填写配置信息：
   - **提供商名称**: 自定义名称，如 `deepseek`, `qwen`, `ollama`
   - **模型名称**: API 调用时使用的模型标识符，如 `deepseek-chat`, `qwen-turbo`
   - **API Base URL** (可选): 如 `https://api.deepseek.com/v1`
     - 留空则使用默认 OpenAI 端点
   - **API Key**: 对应服务的 API 密钥
4. 勾选"**设为默认配置**"（推荐）
5. 点击"添加配置"

**自定义模型示例：**

| 服务 | Provider | Model | Base URL |
|------|----------|-------|----------|
| DeepSeek | `deepseek` | `deepseek-chat` | `https://api.deepseek.com/v1` |
| 通义千问 | `qwen` | `qwen-turbo` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Ollama | `ollama` | `llama2` | `http://localhost:11434/v1` |
| 智谱 AI | `zhipu` | `glm-4` | `https://open.bigmodel.cn/api/paas/v4` |

### 步骤 6: 创建第一个总结

配置好 AI 模型后，就可以开始使用总结功能了。

#### 方式 1: 直接输入文本

1. 在主页的文本输入框中粘贴文章内容
2. 输入标题（可选）
3. 点击"**生成总结**"按钮
4. 等待 AI 处理（通常 5-30 秒）
5. 总结结果会显示在右侧历史记录中

#### 方式 2: 通过 URL 抓取（待实现）

> 注意：URL 抓取功能尚未实现，当前版本仅支持文本输入。

### 步骤 7: 查看和管理总结

- **历史记录**: 右侧显示所有历史总结
- **查看详情**: 点击任意记录查看完整内容
- **总结内容**: 包含摘要和关键要点
- **多配置切换**: 可以添加多个 AI 配置，使用不同模型对比效果

## 获取 AI API Key

### OpenAI

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录或注册账号
3. 点击 "Create new secret key"
4. 复制 API Key（格式：`sk-...`）
5. **注意**: 需要充值才能使用 API

### Claude (Anthropic)

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 登录或注册账号
3. 进入 API Keys 页面
4. 创建新的 API Key（格式：`sk-ant-...`）
5. 复制并保存 API Key

### Gemini (Google)

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录 Google 账号
3. 点击 "Create API Key"
4. 复制 API Key
5. **注意**: 部分地区可能需要 VPN

### DeepSeek (推荐国内用户)

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册并登录
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制 API Key
6. **优势**: 国内访问快，价格便宜

### 通义千问 (阿里云)

1. 访问 [阿里云 DashScope](https://dashscope.console.aliyun.com/)
2. 登录阿里云账号
3. 开通 DashScope 服务
4. 创建 API Key
5. 复制 API Key

## 服务端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 5173 | React + Vite 开发服务器 |
| Go API | 3000 | 主 API 服务 |
| Python AI | 8000 | AI 模型调用服务 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存和消息队列 |
| MinIO | 9000 | 对象存储 API |
| MinIO Console | 9001 | MinIO 管理界面 |

## 常见问题

### Q: 服务启动失败？

**A:** 检查端口是否被占用：
```bash
# Windows
netstat -ano | findstr "3000 5173 8000 5432 6379"

# Linux/Mac
lsof -i :3000,5173,8000,5432,6379
```

如果端口被占用，可以：
1. 停止占用端口的程序
2. 或修改 `docker-compose.yml` 中的端口映射

### Q: 前端显示 403 错误？

**A:** 这是 CORS 配置问题，已在最新版本修复。如果仍有问题：
```bash
# 重启服务
docker-compose restart go-api frontend
```

### Q: 前端无法连接后端？

**A:** 检查 Vite 代理配置：
```bash
# 查看前端日志
docker-compose logs frontend

# 确认环境变量
docker exec rim-frontend env | grep VITE
```

### Q: Celery Worker 启动失败？

**A:** 检查 Redis 连接和任务模块：
```bash
# 查看 Celery 日志
docker-compose logs celery-worker

# 确认 Redis 正常
docker-compose exec redis redis-cli ping
```

### Q: AI 总结失败？

**A:** 可能的原因：
1. **API Key 无效**: 检查 API Key 是否正确
2. **余额不足**: 确认 API 账户有足够余额
3. **网络问题**: 国内访问 OpenAI 可能需要代理
4. **模型不存在**: 确认模型名称正确

**调试方法：**
```bash
# 查看 Python AI 服务日志
docker-compose logs python-ai

# 查看 Celery Worker 日志
docker-compose logs celery-worker
```

### Q: 如何重置所有数据？

**A:** 删除所有数据卷并重新启动：
```bash
docker-compose down -v
docker-compose up -d
```

**警告**: 这会删除所有用户数据、配置和历史记录！

### Q: 如何查看数据库内容？

**A:** 使用 psql 连接数据库：
```bash
docker-compose exec postgres psql -U rim_user -d rim_db

# 查看用户表
\dt
SELECT * FROM users;

# 查看 AI 配置
SELECT id, provider, model, provider_type, is_default FROM ai_configs;

# 退出
\q
```

### Q: 如何更新代码？

**A:** 拉取最新代码并重建容器：
```bash
git pull
docker-compose down
docker-compose up --build -d
```

## 停止服务

```bash
# 停止所有服务（保留数据）
docker-compose down

# 停止并删除所有数据
docker-compose down -v
```

## 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f go-api
docker-compose logs -f python-ai
docker-compose logs -f celery-worker
docker-compose logs -f frontend

# 查看最近 100 行日志
docker-compose logs --tail=100 go-api
```

## 开发模式

如果你想修改代码并实时查看效果：

1. **前端开发**: 代码修改会自动热重载
   ```bash
   # 前端代码在 ./frontend 目录
   # 修改后浏览器自动刷新
   ```

2. **后端开发**: 需要重启容器
   ```bash
   # Go 服务
   docker-compose restart go-api
   
   # Python 服务
   docker-compose restart python-ai celery-worker
   ```

## 生产部署

生产环境部署请参考：
- `docker-compose.prod.yml` - 生产环境配置
- `DEPLOYMENT.md` - 部署文档（待创建）

**重要安全提示：**
1. 修改所有默认密码和密钥
2. 使用 HTTPS
3. 配置防火墙
4. 定期备份数据库
5. 不要在生产环境使用 `AllowOriginFunc: true`

## 需要帮助？

- **项目文档**: 查看 `README.md` 了解项目概述
- **开发指南**: 查看 `CLAUDE.md` 了解开发规范
- **自定义模型**: 查看 `docs/CUSTOM_MODELS.md` 了解详细配置
- **架构说明**: 查看 `架构说明.md` 了解技术架构
- **开发计划**: 查看 `DEVELOPMENT_PLAN.md` 了解功能路线图

## 下一步

- ✅ 配置多个 AI 模型对比效果
- ✅ 尝试不同的文本内容
- ⏳ 等待 URL 抓取功能上线
- ⏳ 等待播客转录功能上线
- ⏳ 等待交叉分析功能上线

---

祝使用愉快！🎉

如有问题，请提交 Issue 或查看项目文档。
