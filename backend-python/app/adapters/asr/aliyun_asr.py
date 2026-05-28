"""
阿里云智能语音交互 ASR 适配器
文档: https://help.aliyun.com/zh/isi/developer-reference/api-nls-cloud-gateway
"""
import asyncio
import hashlib
import hmac
import json
import os
import time
from typing import Dict, Optional

import httpx

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

        # 检查文件大小，阿里云 ASR 限制 2MB
        file_size = os.path.getsize(audio_path)
        max_size = 2 * 1024 * 1024  # 2MB

        if file_size > max_size:
            logger.warning(f"Audio file too large: {file_size / 1024 / 1024:.2f}MB > 2MB, compressing...")
            # 使用 ffmpeg 压缩音频
            compressed_path = audio_path.rsplit('.', 1)[0] + '_compressed.mp3'
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', audio_path,
                '-acodec', 'libmp3lame',
                '-ac', '1',
                '-ar', '16000',
                '-b:a', '64k',
                compressed_path
            ]
            try:
                subprocess.run(cmd, check=True, capture_output=True)
                audio_path = compressed_path
                file_size = os.path.getsize(audio_path)
                logger.info(f"Audio compressed: {file_size / 1024 / 1024:.2f}MB")
            except Exception as e:
                logger.error(f"Audio compression failed: {e}")
                raise ValueError(f"音频文件过大({file_size/1024/1024:.1f}MB)，压缩失败: {e}")

        # 读取音频文件
        with open(audio_path, 'rb') as f:
            audio_data = f.read()

        # 构建请求 URL
        url = f"{self.base_url}?appkey={self.app_key}&format=mp3&sample_rate=16000"

        headers = {
            'X-NLS-Token': self._generate_token(),
            'Content-Type': 'audio/mp3'
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"Calling Aliyun ASR: url={url}, file_size={len(audio_data)}")
                response = await client.post(url, content=audio_data, headers=headers)

                logger.info(f"Aliyun ASR response: status={response.status_code}, body={response.text[:500]}")

                if response.status_code != 200:
                    raise Exception(f"HTTP error: {response.status_code}, body={response.text[:200]}")

                try:
                    result = response.json()
                except Exception as json_err:
                    response_text = response.text
                    logger.error(f"Failed to parse JSON response: {json_err}")
                    logger.error(f"Response status: {response.status_code}")
                    logger.error(f"Response headers: {dict(response.headers)}")
                    logger.error(f"Response body (first 1000 chars): {response_text[:1000]}")
                    raise Exception(f"Invalid JSON response (status={response.status_code}): {response_text[:200]}")

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
            logger.error(f"Aliyun ASR request failed: {e}", exc_info=True)
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
