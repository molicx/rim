"""
OpenAI Whisper ASR 适配器
支持本地 Whisper 模型和云端 API
"""
import asyncio
import os
from typing import Dict, Optional

from . import ASRProvider, TranscriptionResult, TranscriptionSegment

import logging

logger = logging.getLogger(__name__)


class WhisperASR(ASRProvider):
    """OpenAI Whisper 语音识别适配器"""

    def __init__(self, config: Dict):
        self.api_key = config.get('api_key', '')
        self.model = config.get('model', 'whisper-1')
        self.base_url = config.get('base_url', 'https://api.openai.com/v1')
        self.use_local = config.get('use_local', False)
        self.local_model = config.get('local_model', 'base')

    def validate_config(self, config: Dict) -> bool:
        if config.get('use_local'):
            return True  # 本地模式不需要 API Key
        return bool(config.get('api_key'))

    async def transcribe(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """转写音频文件"""
        if self.use_local:
            return await self._transcribe_local(audio_path, options)
        else:
            return await self._transcribe_api(audio_path, options)

    async def _transcribe_api(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """使用 OpenAI API 转写"""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)

        with open(audio_path, 'rb') as audio_file:
            response = await client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                response_format="verbose_json",
                language="zh"
            )

        segments = []
        for seg in response.segments:
            segments.append(TranscriptionSegment(
                start=seg.start,
                end=seg.end,
                text=seg.text
            ))

        return TranscriptionResult(
            text=response.text,
            segments=segments,
            duration=response.duration,
            language="zh"
        )

    async def _transcribe_local(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """使用本地 Whisper 模型转写"""
        try:
            import whisper
        except ImportError:
            raise ImportError("whisper package not installed. Run: pip install openai-whisper")

        # 在线程池中运行阻塞的 whisper 模型
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._run_local_whisper,
            audio_path
        )
        return result

    def _run_local_whisper(self, audio_path: str) -> TranscriptionResult:
        """运行本地 Whisper 模型（阻塞）"""
        import whisper

        model = whisper.load_model(self.local_model)
        result = model.transcribe(audio_path, language="zh")

        segments = []
        for seg in result.get('segments', []):
            segments.append(TranscriptionSegment(
                start=seg['start'],
                end=seg['end'],
                text=seg['text']
            ))

        return TranscriptionResult(
            text=result['text'],
            segments=segments,
            duration=result.get('segments', [{}])[-1].get('end', 0) if result.get('segments') else 0,
            language="zh"
        )
