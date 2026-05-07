"""Celery application configuration."""
import os
from celery import Celery

# 从环境变量获取 Redis URL
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# 创建 Celery 应用
celery_app = Celery(
    "rim_tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["app.tasks.ai_tasks"]  # 包含任务模块
)

# Celery 配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 分钟超时
    task_soft_time_limit=25 * 60,  # 25 分钟软超时
    worker_prefetch_multiplier=1,  # 每次只预取一个任务
    worker_max_tasks_per_child=50,  # 每个 worker 处理 50 个任务后重启
)

# 任务路由配置（可选）
celery_app.conf.task_routes = {
    "app.tasks.ai_tasks.*": {"queue": "ai_tasks"},
}
