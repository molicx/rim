"""
音频转写 Celery 任务
"""
import json
import logging
import os

import httpx

from app.tasks.celery_app import celery_app
from app.services.transcription import TranscriptionService

logger = logging.getLogger(__name__)


def notify_go_callback(task_id: int, status: str, text: str = "", segments: list = None, duration: float = 0, error: str = ""):
    """通知 Go 后端任务完成"""
    go_api_url = os.getenv("GO_API_URL", "http://go-api:3000")
    callback_url = f"{go_api_url}/internal/transcription-callback"

    payload = {
        "task_id": task_id,
        "status": status,
        "result": text,
        "segments": json.dumps(segments) if segments else "",
        "duration": duration,
        "error": error,
    }

    try:
        response = httpx.post(callback_url, json=payload, timeout=10.0)
        if response.status_code != 200:
            logger.error(f"Callback to Go API failed: {response.status_code}")
    except Exception as e:
        logger.error(f"Callback error: {e}")


@celery_app.task(bind=True, name="app.tasks.audio_tasks.transcribe_audio", queue="ai_tasks")
def transcribe_audio_task(self, task_id: int, audio_path: str, provider: str, config: dict):
    """
    异步执行音频转写
    :param task_id: 任务 ID
    :param audio_path: 音频文件路径
    :param provider: ASR 提供商
    :param config: 提供商配置
    """
    import asyncio

    # 更新任务状态为处理中
    self.update_state(state="PROCESSING", meta={"progress": 10})

    try:
        service = TranscriptionService()

        # 验证音频文件
        is_valid, err_msg = service.validate_audio_file(audio_path)
        if not is_valid:
            notify_go_callback(task_id, "failed", error=err_msg)
            return {"status": "failed", "error": err_msg}

        self.update_state(state="PROCESSING", meta={"progress": 30})

        # 转换音频格式
        converted_path = service.convert_to_wav(audio_path)
        self.update_state(state="PROCESSING", meta={"progress": 50})

        # 执行转写（在线程中运行异步代码）
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(
            service.transcribe(converted_path, provider, config)
        )
        loop.close()

        self.update_state(state="PROCESSING", meta={"progress": 90})

        # 清理临时文件
        if converted_path != audio_path:
            try:
                os.remove(converted_path)
            except:
                pass

        # 构建结果
        segments = [
            {"start": s.start, "end": s.end, "text": s.text}
            for s in result.segments
        ]

        # 通知 Go 后端
        notify_go_callback(
            task_id,
            "completed",
            text=result.text,
            segments=segments,
            duration=result.duration,
        )

        return {
            "status": "completed",
            "text": result.text,
            "segments": segments,
            "duration": result.duration,
        }

    except Exception as e:
        logger.error(f"Transcription task failed: {e}")
        notify_go_callback(task_id, "failed", error=str(e))
        return {"status": "failed", "error": str(e)}
