"""
阿里云智能语音交互 ASR 适配器
文档: https://help.aliyun.com/zh/isi/developer-reference/api-nls-cloud-gateway
"""
import asyncio
import json
import time
from typing import Dict, Optional

import aiohttp

from . import ASRProvider, TranscriptionResult, TranscriptionSegment

import logging

logger = logging.getLogger(__name__)


class AliyunASR(ASRProvider):
    """阿里云语音识别适配器"""

    def __init__(self, config: Dict):
        self.access_key_id = config.get('access_key_id', '')
        self.access_key_secret = config.get('access_key_secret', '')
        self.app_key = config.get('app_key', '')
        self.region = config.get('region', 'cn-shanghai')
        self.base_url = f"https://nls-gateway.{self.region}.aliyuncs.com/stream/v1/asr"

    def validate_config(self, config: Dict) -> bool:
        return bool(
            config.get('access_key_id') and
            config.get('access_key_secret') and
            config.get('app_key')
        )

    async def transcribe(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """转写音频文件"""
        options = options or {}

        # 读取音频文件（需要 PCM 格式，16kHz，16bit，单声道）
        with open(audio_path, 'rb') as f:
            audio_data = f.read()

        # 构建请求 URL
        url = f"{self.base_url}?appkey={self.app_key}&format=pcm&sample_rate=16000"

        headers = {
            'X-NLS-Token': self._generate_token(),
            'Content-Type': 'application/octet-stream'
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=audio_data, headers=headers) as resp:
                    result = await resp.json()

                    if result.get('status') != 20000000:
                        logger.error(f"Aliyun ASR error: {result}")
                        raise Exception(f"ASR failed: {result.get('message', 'Unknown error')}")

                    text = result.get('result', '')

                    return TranscriptionResult(
                        text=text,
                        segments=[TranscriptionSegment(
                            start=0,
                            end=result.get('duration', 0) / 1000,
                            text=text
                        )],
                        duration=result.get('duration', 0) / 1000,
                        language="zh"
                    )
        except Exception as e:
            logger.error(f"Aliyun ASR request failed: {e}")
            raise

    def _generate_token(self) -> str:
        """生成访问令牌（简化版，实际应该使用阿里云 SDK）"""
        # 实际使用时应该使用 aliyun-python-sdk-core 生成 token
        import hashlib
        timestamp = str(int(time.time()))
        sign_str = f"{self.access_key_id}{timestamp}"
        signature = hmac.new(
            self.access_key_secret.encode(),
            sign_str.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{timestamp}:{signature}"
