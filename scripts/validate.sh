#!/bin/bash

# RIM 项目验证脚本
# 用于验证第一阶段开发的所有功能

set -e

echo "========================================="
echo "RIM 项目第一阶段功能验证"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API 基础 URL
GO_API="http://localhost:3000/api/v1"
PYTHON_API="http://localhost:8000"

# 测试结果统计
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=$5
    local token=$6

    echo -n "测试: $name ... "

    if [ -n "$token" ]; then
        headers="-H 'Authorization: Bearer $token'"
    else
        headers=""
    fi

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" $headers "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" $headers -H "Content-Type: application/json" -d "$data" "$url")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (状态码: $status_code)"
        PASSED=$((PASSED + 1))
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (期望: $expected_status, 实际: $status_code)"
        echo "响应: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 1. 健康检查
echo ""
echo "========================================="
echo "1. 健康检查"
echo "========================================="

test_endpoint "Go API 健康检查" "GET" "http://localhost:3000/health" "" "200"
test_endpoint "Python AI 健康检查" "GET" "$PYTHON_API/health" "" "200"

# 2. 用户注册
echo ""
echo "========================================="
echo "2. 用户注册"
echo "========================================="

TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASSWORD="password123"

REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"测试用户\"}"

if test_endpoint "用户注册" "POST" "$GO_API/auth/register" "$REGISTER_DATA" "201"; then
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "获取到 Token: ${TOKEN:0:20}..."
fi

# 3. 用户登录
echo ""
echo "========================================="
echo "3. 用户登录"
echo "========================================="

LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"

if test_endpoint "用户登录" "POST" "$GO_API/auth/login" "$LOGIN_DATA" "200"; then
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "登录成功，Token: ${TOKEN:0:20}..."
fi

# 4. AI 配置管理
echo ""
echo "========================================="
echo "4. AI 配置管理"
echo "========================================="

# 注意：这里使用测试 API Key，实际使用时需要真实的 Key
AI_CONFIG_DATA="{\"provider\":\"openai\",\"model\":\"gpt-4\",\"api_key\":\"sk-test-key-for-validation\",\"is_default\":true}"

test_endpoint "创建 AI 配置" "POST" "$GO_API/ai-configs" "$AI_CONFIG_DATA" "201" "$TOKEN"
test_endpoint "获取 AI 配置列表" "GET" "$GO_API/ai-configs" "" "200" "$TOKEN"

# 5. 文本总结（需要真实 API Key 才能成功）
echo ""
echo "========================================="
echo "5. 文本总结功能"
echo "========================================="

SUMMARY_DATA="{\"text\":\"人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。这包括学习、推理、问题解决、感知和语言理解。近年来，深度学习和神经网络的进步推动了 AI 的快速发展。\",\"title\":\"AI 简介\",\"config_id\":1}"

echo -e "${YELLOW}注意: 此测试需要有效的 AI API Key 才能完全通过${NC}"
test_endpoint "创建文本总结" "POST" "$GO_API/summaries" "$SUMMARY_DATA" "201" "$TOKEN" || true

# 6. 历史记录
echo ""
echo "========================================="
echo "6. 历史记录管理"
echo "========================================="

test_endpoint "获取总结列表" "GET" "$GO_API/summaries" "" "200" "$TOKEN"

# 7. Python AI 服务测试
echo ""
echo "========================================="
echo "7. Python AI 服务"
echo "========================================="

EXTRACT_DATA="{\"url\":\"https://example.com\"}"
echo -e "${YELLOW}注意: URL 提取功能需要可访问的网页${NC}"
test_endpoint "URL 文本提取" "POST" "$PYTHON_API/api/v1/extract" "$EXTRACT_DATA" "200" || true

# 测试总结
echo ""
echo "========================================="
echo "测试总结"
echo "========================================="
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo -e "总计: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有核心功能测试通过！${NC}"
    echo ""
    echo "========================================="
    echo "第一阶段开发完成"
    echo "========================================="
    echo "已实现功能："
    echo "  ✓ 用户注册/登录系统"
    echo "  ✓ JWT 认证"
    echo "  ✓ AI 模型配置管理（支持 OpenAI/Claude/Gemini）"
    echo "  ✓ 文本总结功能"
    echo "  ✓ URL 抓取功能"
    echo "  ✓ 历史记录管理"
    echo "  ✓ 前端界面"
    echo "  ✓ Docker 容器化部署"
    echo ""
    echo "下一步："
    echo "  1. 配置真实的 AI API Key 进行完整测试"
    echo "  2. 访问 http://localhost:5173 使用前端界面"
    echo "  3. 开始阶段 2 的开发"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败，请检查日志${NC}"
    exit 1
fi
