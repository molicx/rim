FROM python:3.11-slim

WORKDIR /app

# 1. 先安装 sed（它属于 util-linux 包的一部分，但在 slim 镜像中常被移除，直接用 apt 安装即可）
# 2. 使用 sed 替换源
# 3. 安装 gcc/g++
RUN apt-get update && \
    apt-get install -y --no-install-recommends sed && \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# 设置 pip 源环境变量
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV PIP_TIMEOUT=120

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]