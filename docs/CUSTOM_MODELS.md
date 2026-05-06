# 自定义模型配置指南

RIM 支持配置任何兼容 OpenAI API 格式的模型服务。

## 支持的配置类型

### 1. 预设模型（原生接口）
- **OpenAI**: GPT-4, GPT-4o, GPT-3.5-turbo
- **Claude**: Claude 3.5 Sonnet, Claude 3 Opus
- **Gemini**: Gemini Pro, Gemini Pro Vision

### 2. 自定义模型（OpenAI 兼容接口）
任何实现了 OpenAI Chat Completions API 的服务都可以配置使用。

## 配置示例

### DeepSeek
```json
{
  "provider": "deepseek",
  "provider_type": "openai_compatible",
  "model": "deepseek-chat",
  "base_url": "https://api.deepseek.com/v1",
  "api_key": "your-deepseek-api-key"
}
```

### 通义千问 (Qwen)
```json
{
  "provider": "qwen",
  "provider_type": "openai_compatible",
  "model": "qwen-turbo",
  "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "api_key": "your-qwen-api-key"
}
```

### Ollama (本地部署)
```json
{
  "provider": "ollama",
  "provider_type": "openai_compatible",
  "model": "llama3",
  "base_url": "http://localhost:11434/v1",
  "api_key": "ollama"
}
```

### Azure OpenAI
```json
{
  "provider": "azure",
  "provider_type": "openai_compatible",
  "model": "gpt-4",
  "base_url": "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
  "api_key": "your-azure-api-key"
}
```

### 智谱 AI (GLM)
```json
{
  "provider": "zhipu",
  "provider_type": "openai_compatible",
  "model": "glm-4",
  "base_url": "https://open.bigmodel.cn/api/paas/v4",
  "api_key": "your-zhipu-api-key"
}
```

## 前端配置步骤

1. 点击"AI 配置"按钮
2. 选择"自定义模型"
3. 填写以下信息：
   - **提供商名称**: 自定义标识（如 deepseek, qwen）
   - **模型名称**: API 调用时的模型标识符
   - **API Base URL**: 服务端点（可选，留空使用默认 OpenAI 端点）
   - **API Key**: 你的 API 密钥
4. 可选择设为默认配置
5. 点击"添加配置"

## API 要求

自定义模型服务必须实现以下 OpenAI 兼容接口：

### Chat Completions
```
POST {base_url}/chat/completions
Content-Type: application/json

{
  "model": "model-name",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### 响应格式
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ]
}
```

## 常见问题

### Q: Base URL 应该填什么？
A: 填写服务的 API 端点，通常以 `/v1` 结尾。如果服务完全兼容 OpenAI，可以留空。

### Q: 如何测试配置是否正确？
A: 添加配置后，创建一个测试总结。如果失败，检查：
- API Key 是否正确
- Base URL 是否正确（包括协议 http/https）
- 模型名称是否正确
- 服务是否可访问

### Q: 支持哪些模型？
A: 理论上支持所有兼容 OpenAI Chat Completions API 的模型服务。

### Q: 可以配置多个模型吗？
A: 可以，你可以添加多个配置，并设置其中一个为默认。

### Q: API Key 安全吗？
A: API Key 使用 AES-256 加密后存储在数据库中，不会明文保存。

## 技术细节

### 数据库字段
- `provider`: 提供商名称（用户自定义）
- `provider_type`: `native` 或 `openai_compatible`
- `model`: 模型标识符
- `base_url`: 自定义 API 端点（可选）
- `api_key`: 加密存储的 API 密钥

### Python 适配器
使用 `GenericOpenAIAdapter` 处理所有 OpenAI 兼容接口：
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=api_key,
    base_url=base_url  # 如果提供
)
```

## 贡献

如果你成功配置了某个模型服务，欢迎提交配置示例到此文档！
