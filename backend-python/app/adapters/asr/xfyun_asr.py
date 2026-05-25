"""
讯飞开放平台 ASR 适配器
文档: https://www.xfyun.cn/doc/asr/voicedictation/API.html
"""
import asyncio
import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Dict, Optional
from urllib.parse import urlencode

import aiohttp

from . import ASRProvider, TranscriptionResult, TranscriptionSegment

import logging

logger = logging.getLogger(__name__)


class XunfeiASR(ASRProvider):
    """讯飞语音识别适配器"""

    def __init__(self, config: Dict):
        self.api_key = config.get('api_key', '')
        self.api_secret = config.get('api_secret', '')
        self.app_id = config.get('app_id', '')
        self.base_url = config.get('base_url', 'https://iat-api.xfyun.cn/v2/iat')

    def validate_config(self, config: Dict) -> bool:
        return bool(config.get('api_key') and config.get('api_secret') and config.get('app_id'))

    def _generate_auth_url(self) -> str:
        """生成带认证的 URL"""
        now = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())
        signature_origin = f"host: iat-api.xfyun.cn\ndate: {now}\nGET /v2/iat HTTP/1.1"
        signature_sha = hmac.new(
            self.api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            hashlib.sha256
        ).digest()
        signature = base64.b64encode(signature_sha).decode('utf-8')
        authorization = base64.b64encode(
            f'api_key="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'.encode('utf-8')
        ).decode('utf-8')

        params = {
            'authorization': authorization,
            'date': now,
            'host': 'iat-api.xfyun.cn'
        }
        return f"{self.base_url}?{urlencode(params)}"

    async def transcribe(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """
        转写音频文件
        讯飞 API 支持最大 60 秒的音频，长音频需要分段处理
        """
        options = options or {}

        # 读取音频文件
        with open(audio_path, 'rb') as f:
            audio_data = f.read()

        # 分段处理（每段 60 秒）
        # 这里简化处理，实际应该根据音频时长分段
        chunk_size = 1024 * 1024  # 1MB chunks
        chunks = [audio_data[i:i + chunk_size] for i in range(0, len(audio_data), chunk_size)]

        all_segments = []
        full_text = ""

        for i, chunk in enumerate(chunks):
            result = await self._transcribe_chunk(chunk, i)
            if result:
                all_segments.extend(result.segments)
                full_text += result.text

        return TranscriptionResult(
            text=full_text,
            segments=all_segments,
            duration=len(chunks) * 60,  # 估算
            language="zh"
        )

    async def _transcribe_chunk(self, audio_chunk: bytes, index: int) -> Optional[TranscriptionResult]:
        """转写单个音频块"""
        url = self._generate_auth_url()

        # Base64 编码音频
        audio_base64 = base64.b64encode(audio_chunk).decode('utf-8')

        # 构建请求体
        body = {
            'common': {'app_id': self.app_id},
            'business': {
                'language': 'zh_cn',
                'domain': 'iat',
                'accent': 'mandarin',
                'vad_eos': 5000,
                'dwa': 'wpgs'
            },
            'data': {
                'status': 2,  # 完整音频
                'format': 'audio/L16;rate=16000',
                'encoding': 'raw',
                'audio': audio_base64
            }
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body) as resp:
                    result = await resp.json()

                    if result.get('code') != 0:
                        logger.error(f"Xunfei ASR error: {result}")
                        return None

                    data = result.get('data', {})
                    text = data.get('result', {}).get('text', '')

                    return TranscriptionResult(
                        text=text,
                        segments=[TranscriptionSegment(
                            start=index * 60,
                            end=(index + 1) * 60,
                            text=text
                        )],
                        duration=60,
                        language="zh"
                    )
        except Exception as e:
            logger.error(f"Xunfei ASR request failed: {e}")
            return None
