# RIM 项目文档索引

## 核心文档

### 用户文档
- **[README.md](README.md)** - 项目主文档，快速开始指南
- **[README_PROJECT.md](README_PROJECT.md)** - 完整产品愿景和规划
- **[QUICKSTART.md](QUICKSTART.md)** - 快速启动指南
- **[docs/CUSTOM_MODELS.md](docs/CUSTOM_MODELS.md)** - 自定义模型配置指南

### 开发文档
- **[CLAUDE.md](CLAUDE.md)** - 项目开发指导（给 AI 助手）
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - 完整开发计划（8 个阶段）
- **[架构说明.md](架构说明.md)** - 技术架构设计

### 项目管理
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - 项目总结
- **[CHECKLIST.md](CHECKLIST.md)** - 功能验证清单
- **[DELIVERY.md](DELIVERY.md)** - 交付文档

## 文档说明

### README.md
**用途**: 项目主入口文档（第一阶段 MVP）  
**内容**:
- 第一阶段已实现功能
- 快速启动指南
- 使用指南（注册、配置、创建总结）
- 项目结构
- API 文档
- 常见问题

**适合**: 新用户、部署人员

### README_PROJECT.md
**用途**: 完整产品愿景和规划  
**内容**:
- 完整的核心特性（包括未来功能）
- 技术架构
- 本地开发指南
- 完整的功能列表

**适合**: 产品规划、投资人展示、长期愿景了解

### QUICKSTART.md
**用途**: 最简化的启动指南  
**内容**:
- 3 步启动项目
- 基础使用流程
- 故障排查

**适合**: 快速体验项目

### docs/CUSTOM_MODELS.md
**用途**: 自定义模型配置详细指南  
**内容**:
- 支持的配置类型
- 各种模型的配置示例（DeepSeek, Qwen, Ollama 等）
- 前端配置步骤
- API 要求说明
- 常见问题

**适合**: 需要使用自定义模型的用户

### CLAUDE.md
**用途**: 项目开发指导文档（给 AI 助手）  
**内容**:
- 项目概述和技术栈
- 开发命令
- 架构原则
- 代码规范
- AI 模型适配器开发
- 数据库迁移
- 安全注意事项
- 故障排查
- MVP 开发阶段

**适合**: AI 助手、新加入的开发者

### DEVELOPMENT_PLAN.md
**用途**: 完整的产品开发路线图  
**内容**:
- 技术栈选择和理由
- 8 个开发阶段详细规划
  - 阶段 1: 核心 MVP ✅
  - 阶段 2: 文件上传和解析
  - 阶段 3: 播客音频处理
  - 阶段 4: 多内容交叉分析
  - 阶段 5: 导出和分享
  - 阶段 6: 知识管理
  - 阶段 7: 移动端和浏览器扩展
  - 阶段 8: 高级功能
- 每个阶段的功能清单、技术要点、时间估算

**适合**: 产品经理、技术负责人、长期开发规划

### 架构说明.md
**用途**: 技术架构设计文档  
**内容**:
- 微服务架构设计
- 服务职责划分
- 数据流向
- 技术选型理由

**适合**: 架构师、技术评审

### PROJECT_SUMMARY.md
**用途**: 项目总结和状态报告  
**内容**:
- 项目背景
- 已完成功能
- 技术亮点
- 下一步计划

**适合**: 项目汇报、进度跟踪

### CHECKLIST.md
**用途**: 功能验证清单  
**内容**:
- 代码完整性检查
- 配置文件检查
- 功能实现检查
- 安全性检查
- 验证步骤
- 交付物清单

**适合**: 测试人员、交付验收

### DELIVERY.md
**用途**: 正式交付文档  
**内容**:
- 交付物清单
- 部署说明
- 验证步骤
- 已知限制
- 后续开发建议

**适合**: 项目交接、客户交付

## 文档维护

### 更新频率
- **README.md**: 每次新功能发布时更新
- **CLAUDE.md**: 架构或规范变更时更新
- **DEVELOPMENT_PLAN.md**: 阶段完成或计划调整时更新
- **CUSTOM_MODELS.md**: 新增支持的模型时更新

### 文档同步
代码变更时，相关文档必须同步更新：
- 新增 API 端点 → 更新 README.md API 文档
- 新增配置项 → 更新 CLAUDE.md 和 README.md
- 架构调整 → 更新 架构说明.md 和 CLAUDE.md
- 新功能完成 → 更新 README.md 和 CHECKLIST.md

## 已删除的文档

- ~~README_OLD.md~~ - 旧版需求文档（已过时，已删除）

## 保留的文档

- **README_PROJECT.md** - 完整产品愿景，包含所有规划功能（阶段 1-8）

## 快速导航

**我想...**
- 快速启动项目 → [QUICKSTART.md](QUICKSTART.md)
- 了解已实现功能 → [README.md](README.md)
- 了解完整产品规划 → [README_PROJECT.md](README_PROJECT.md)
- 配置自定义模型 → [docs/CUSTOM_MODELS.md](docs/CUSTOM_MODELS.md)
- 参与开发 → [CLAUDE.md](CLAUDE.md)
- 查看开发计划 → [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)
- 了解架构设计 → [架构说明.md](架构说明.md)
- 验证功能 → [CHECKLIST.md](CHECKLIST.md)
- 项目交付 → [DELIVERY.md](DELIVERY.md)
