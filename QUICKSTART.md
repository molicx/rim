# RIM 快速启动指南

## 3 分钟快速开始

```bash
cd rim
cp .env.example .env
docker-compose up -d
```

访问：**http://localhost:5173**

## 首次使用

1. **注册账号** → http://localhost:5173/register
2. **配置 AI 模型** → 点击右上角"AI 配置"
3. **创建总结** → Dashboard 选择输入方式

## 端口说明

| 服务 | 端口 |
|------|------|
| 前端 | 5173 |
| Go API | 3000 |
| Python AI | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## 常见问题

**服务启动失败？** 检查端口是否被占用

**AI 总结失败？** 检查 API Key 是否有效

**URL 抓取失败？** 某些网站有反爬虫机制，建议直接复制文本
