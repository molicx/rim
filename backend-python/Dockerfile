FROM python:3.11-slim

WORKDIR /app

# 换国内 apt 镜像源（阿里云）
RUN sed -i 's|http://deb.debian.org/debian|https://mirrors.aliyun.com/debian|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    sed -i 's|http://security.debian.org|https://mirrors.aliyun.com/debian-security|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true

# 设置 pip 使用国内镜像源（清华源）
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

# 复制并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --default-timeout=120

# 复制应用代码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]