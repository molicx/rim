#!/bin/bash

# RIM 项目启动脚本

echo "========================================="
echo "启动 RIM 项目"
echo "========================================="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    cp .env.example .env
    echo "✓ .env 文件已创建"
    echo ""
    echo "提示: 你可以编辑 .env 文件添加 AI API Key"
    echo ""
fi

# 停止旧容器
echo "停止旧容器..."
docker-compose down

# 构建并启动服务
echo ""
echo "构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "检查服务状态..."
docker-compose ps

echo ""
echo "========================================="
echo "服务启动完成！"
echo "========================================="
echo ""
echo "访问地址:"
echo "  前端界面: http://localhost:5173"
echo "  Go API:   http://localhost:3000"
echo "  Python AI: http://localhost:8000"
echo ""
echo "查看日志:"
echo "  docker-compose logs -f"
echo ""
echo "运行验证脚本:"
echo "  ./scripts/validate.sh"
echo ""
