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

# 任务路由配置
celery_app.conf.task_routes = {
    "app.tasks.ai_tasks.*": {"queue": "ai_tasks"},
    "app.tasks.audio_tasks.*": {"queue": "ai_tasks"},
}

# 导入任务模块以注册 Celery 任务
# 必须在 celery_app 创建之后导入
from . import ai_tasks  # noqa: F401
from . import audio_tasks  # noqa: F401

# 打印已注册的任务（调试用）
import logging
logger = logging.getLogger(__name__)
logger.info(f"Celery registered tasks: {list(celery_app.tasks.keys())}")
