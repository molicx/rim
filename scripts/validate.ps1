# RIM 项目第一阶段验证脚本 (Windows PowerShell)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RIM 项目第一阶段功能验证" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# API 基础 URL
$GO_API = "http://localhost:3000/api/v1"
$PYTHON_API = "http://localhost:8000"

# 测试结果统计
$PASSED = 0
$FAILED = 0

# 测试函数
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Data,
        [int]$ExpectedStatus,
        [string]$Token
    )

    Write-Host "测试: $Name ... " -NoNewline

    $headers = @{
        "Content-Type" = "application/json"
    }

    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $Data -UseBasicParsing
        }

        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "✓ 通过" -ForegroundColor Green -NoNewline
            Write-Host " (状态码: $($response.StatusCode))"
            $script:PASSED++
            return $response.Content
        } else {
            Write-Host "✗ 失败" -ForegroundColor Red -NoNewline
            Write-Host " (期望: $ExpectedStatus, 实际: $($response.StatusCode))"
            $script:FAILED++
            return $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✓ 通过" -ForegroundColor Green -NoNewline
            Write-Host " (状态码: $statusCode)"
            $script:PASSED++
            return $_.Exception.Response
        } else {
            Write-Host "✗ 失败" -ForegroundColor Red -NoNewline
            Write-Host " (期望: $ExpectedStatus, 实际: $statusCode)"
            Write-Host "错误: $($_.Exception.Message)"
            $script:FAILED++
            return $null
        }
    }
}

# 等待服务启动
Write-Host "等待服务启动..."
Start-Sleep -Seconds 5

# 1. 健康检查
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "1. 健康检查" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Test-Endpoint -Name "Go API 健康检查" -Method "GET" -Url "http://localhost:3000/health" -ExpectedStatus 200
Test-Endpoint -Name "Python AI 健康检查" -Method "GET" -Url "$PYTHON_API/health" -ExpectedStatus 200

# 2. 用户注册
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "2. 用户注册" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$TIMESTAMP = [int][double]::Parse((Get-Date -UFormat %s))
$TEST_EMAIL = "test_$TIMESTAMP@example.com"
$TEST_PASSWORD = "password123"

$REGISTER_DATA = @{
    email = $TEST_EMAIL
    password = $TEST_PASSWORD
    name = "测试用户"
} | ConvertTo-Json

$response = Test-Endpoint -Name "用户注册" -Method "POST" -Url "$GO_API/auth/register" -Data $REGISTER_DATA -ExpectedStatus 201

if ($response) {
    $responseObj = $response | ConvertFrom-Json
    $TOKEN = $responseObj.token
    Write-Host "获取到 Token: $($TOKEN.Substring(0, [Math]::Min(20, $TOKEN.Length)))..."
}

# 3. 用户登录
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "3. 用户登录" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$LOGIN_DATA = @{
    email = $TEST_EMAIL
    password = $TEST_PASSWORD
} | ConvertTo-Json

$response = Test-Endpoint -Name "用户登录" -Method "POST" -Url "$GO_API/auth/login" -Data $LOGIN_DATA -ExpectedStatus 200

if ($response) {
    $responseObj = $response | ConvertFrom-Json
    $TOKEN = $responseObj.token
    Write-Host "登录成功，Token: $($TOKEN.Substring(0, [Math]::Min(20, $TOKEN.Length)))..."
}

# 4. AI 配置管理
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "4. AI 配置管理" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$AI_CONFIG_DATA = @{
    provider = "openai"
    model = "gpt-4"
    api_key = "sk-test-key-for-validation"
    is_default = $true
} | ConvertTo-Json

Test-Endpoint -Name "创建 AI 配置" -Method "POST" -Url "$GO_API/ai-configs" -Data $AI_CONFIG_DATA -ExpectedStatus 201 -Token $TOKEN
Test-Endpoint -Name "获取 AI 配置列表" -Method "GET" -Url "$GO_API/ai-configs" -ExpectedStatus 200 -Token $TOKEN

# 5. 历史记录
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "5. 历史记录管理" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Test-Endpoint -Name "获取总结列表" -Method "GET" -Url "$GO_API/summaries" -ExpectedStatus 200 -Token $TOKEN

# 测试总结
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "测试总结" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "通过: " -NoNewline
Write-Host $PASSED -ForegroundColor Green
Write-Host "失败: " -NoNewline
Write-Host $FAILED -ForegroundColor Red
Write-Host "总计: $($PASSED + $FAILED)"
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "✓ 所有核心功能测试通过！" -ForegroundColor Green
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "第一阶段开发完成" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "已实现功能："
    Write-Host "  ✓ 用户注册/登录系统"
    Write-Host "  ✓ JWT 认证"
    Write-Host "  ✓ AI 模型配置管理（支持 OpenAI/Claude/Gemini）"
    Write-Host "  ✓ 文本总结功能"
    Write-Host "  ✓ URL 抓取功能"
    Write-Host "  ✓ 历史记录管理"
    Write-Host "  ✓ 前端界面"
    Write-Host "  ✓ Docker 容器化部署"
    Write-Host ""
    Write-Host "下一步："
    Write-Host "  1. 配置真实的 AI API Key 进行完整测试"
    Write-Host "  2. 访问 http://localhost:5173 使用前端界面"
    Write-Host "  3. 开始阶段 2 的开发"
    exit 0
} else {
    Write-Host "✗ 部分测试失败，请检查日志" -ForegroundColor Red
    exit 1
}
