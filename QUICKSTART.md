# RIM 快速启动指南

## 5 分钟快速开始

### 步骤 1: 启动服务

**Windows:**
```powershell
# 使用启动脚本
powershell -ExecutionPolicy Bypass -File scripts\start.ps1

# 或手动启动
docker-compose up -d
```

**Linux/Mac:**
```bash
# 使用启动脚本
chmod +x scripts/start.sh
./scripts/start.sh

# 或手动启动
docker-compose up -d
```

### 步骤 2: 等待服务就绪

等待约 30 秒，所有服务启动完成。

查看服务状态：
```bash
docker-compose ps
```

所有服务应该显示为 "Up" 状态。

### 步骤 3: 访问应用

打开浏览器访问：http://localhost:5173

### 步骤 4: 注册账号

1. 点击"注册"
2. 输入邮箱和密码（至少 6 位）
3. 点击"注册"按钮

### 步骤 5: 配置 AI 模型

1. 登录后，点击右上角"AI 配置"
2. 选择 AI 提供商（OpenAI/Claude/Gemini）
3. 选择模型
4. 输入你的 API Key
5. 勾选"设为默认"
6. 点击"保存"

### 步骤 6: 创建第一个总结

**方式 1: 文本输入**
1. 在左侧输入框粘贴文章内容
2. 输入标题（可选）
3. 点击"生成总结"

**方式 2: URL 输入**
1. 点击"URL"按钮
2. 输入文章链接
3. 输入标题（可选）
4. 点击"生成总结"

### 步骤 7: 查看结果

- 总结会显示在右侧历史记录中
- 点击记录可查看详情
- 包含摘要和关键要点

## 获取 AI API Key

### OpenAI
1. 访问 https://platform.openai.com/api-keys
2. 登录或注册账号
3. 点击"Create new secret key"
4. 复制 API Key（格式：sk-...）

### Claude (Anthropic)
1. 访问 https://console.anthropic.com/
2. 登录或注册账号
3. 进入 API Keys 页面
4. 创建新的 API Key（格式：sk-ant-...）

### Gemini (Google)
1. 访问 https://makersuite.google.com/app/apikey
2. 登录 Google 账号
3. 点击"Create API Key"
4. 复制 API Key

## 验证功能

运行验证脚本测试所有功能：

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/validate.sh
./scripts/validate.sh
```

## 常见问题

### Q: 服务启动失败？
A: 检查端口是否被占用（3000, 5173, 8000, 5432, 6379）

### Q: 无法访问前端？
A: 等待 30 秒后再试，或查看日志：`docker-compose logs frontend`

### Q: AI 总结失败？
A: 确保 API Key 有效且有足额度

### Q: 如何重置数据？
A: 运行 `docker-compose down -v && docker-compose up -d`

## 停止服务

```bash
docker-compose down
```

## 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f go-api
docker-compose logs -f python-ai
docker-compose logs -f frontend
```

## 需要帮助？

- 查看 README.md 了解详细信息
- 查看 DELIVERY.md 了解技术细节
- 查看 DEVELOPMENT_PLAN.md 了解开发计划

---

祝使用愉快！🎉
