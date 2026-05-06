# RIM 项目启动脚本 (Windows PowerShell)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "启动 RIM 项目" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
try {
    docker info | Out-Null
} catch {
    Write-Host "错误: Docker 未运行，请先启动 Docker" -ForegroundColor Red
    exit 1
}

# 检查 .env 文件
if (-not (Test-Path .env)) {
    Write-Host "创建 .env 文件..."
    Copy-Item .env.example .env
    Write-Host "✓ .env 文件已创建" -ForegroundColor Green
    Write-Host ""
    Write-Host "提示: 你可以编辑 .env 文件添加 AI API Key" -ForegroundColor Yellow
    Write-Host ""
}

# 停止旧容器
Write-Host "停止旧容器..."
docker-compose down

# 构建并启动服务
Write-Host ""
Write-Host "构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
Write-Host ""
Write-Host "等待服务启动..."
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host ""
Write-Host "检查服务状态..."
docker-compose ps

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "服务启动完成！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "访问地址:"
Write-Host "  前端界面: http://localhost:5173"
Write-Host "  Go API:   http://localhost:3000"
Write-Host "  Python AI: http://localhost:8000"
Write-Host ""
Write-Host "查看日志:"
Write-Host "  docker-compose logs -f"
Write-Host ""
Write-Host "运行验证脚本:"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\validate.ps1"
Write-Host ""
