"""
音频转写 Celery 任务
"""
import json
import logging

from app.tasks.celery_app import celery_app
from app.services.transcription import TranscriptionService

logger = logging.getLogger(__name__)


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
            import os
            try:
                os.remove(converted_path)
            except:
                pass

        # 构建结果
        segments = [
            {"start": s.start, "end": s.end, "text": s.text}
            for s in result.segments
        ]

        return {
            "status": "completed",
            "text": result.text,
            "segments": segments,
            "duration": result.duration,
        }

    except Exception as e:
        logger.error(f"Transcription task failed: {e}")
        return {"status": "failed", "error": str(e)}
