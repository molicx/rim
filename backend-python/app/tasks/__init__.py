"""Celery tasks module."""
from .celery_app import celery_app
from . import ai_tasks  # noqa: F401 - 注册 Celery 任务
from . import audio_tasks  # noqa: F401 - 注册 Celery 任务

__all__ = ["celery_app"]
