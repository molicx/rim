FROM python:3.11-slim

WORKDIR /app

# 核心优化：合并系统依赖安装与源更换
# 1. 先替换 Debian 的 apt 源为阿里云（苏州访问极快）
# 2. 安装 gcc/g++ 编译器
# 3. 利用环境变量临时指定 pip 源（比写入配置文件更快，且不残留文件）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y gcc g++ && \
    rm -rf /var/lib/apt/lists/* && \
    # 临时通过环境变量指定清华源，安装完即销毁，不占用层空间
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir some-package-that-needs-compile-if-any

# 复制并安装 Python 依赖 (此时 pip 会自动读取上一步设置的环境变量或默认使用官方源)
# 如果上一步没设置环境变量，这里显式指定 -i
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制应用代码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]FROM python:3.11-slim

WORKDIR /app

# 核心优化：合并系统依赖安装与源更换
# 1. 先替换 Debian 的 apt 源为阿里云（苏州访问极快）
# 2. 安装 gcc/g++ 编译器
# 3. 利用环境变量临时指定 pip 源（比写入配置文件更快，且不残留文件）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y gcc g++ && \
    rm -rf /var/lib/apt/lists/* && \
    # 临时通过环境变量指定清华源，安装完即销毁，不占用层空间
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir some-package-that-needs-compile-if-any

# 复制并安装 Python 依赖 (此时 pip 会自动读取上一步设置的环境变量或默认使用官方源)
# 如果上一步没设置环境变量，这里显式指定 -i
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制应用代码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]