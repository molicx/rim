"""
阿里云智能语音交互 ASR 适配器
文档: https://help.aliyun.com/zh/isi/developer-reference/api-nls-cloud-gateway
"""
import asyncio
import json
import os
import time
from typing import Dict, Optional

import httpx
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

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
        self._token = None
        self._token_expire = 0
        self._client = AcsClient(
            self.access_key_id,
            self.access_key_secret,
            self.region
        )

    def validate_config(self, config: Dict) -> bool:
        return bool(
            config.get('access_key_id') and
            config.get('access_key_secret') and
            config.get('app_key')
        )

    def _get_token(self) -> str:
        """使用阿里云 SDK 获取 token，带缓存"""
        now = time.time()
        if self._token and now < self._token_expire:
            return self._token

        request = CommonRequest()
        request.set_method('POST')
        request.set_domain('nls-meta.' + self.region + '.aliyuncs.com')
        request.set_version('2019-02-28')
        request.set_action_name('CreateToken')

        try:
            response = self._client.do_action_with_exception(request)
            result = json.loads(response)
            token_info = result.get('Token', {})
            self._token = token_info.get('Id', '')
            expire_time = token_info.get('ExpireTime', 0)
            self._token_expire = expire_time - 300
            logger.info(f"Got Aliyun ASR token, expires at {expire_time}")
            return self._token
        except Exception as e:
            logger.error(f"Failed to get Aliyun token: {e}", exc_info=True)
            raise

    async def transcribe(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """转写音频文件，超长音频自动分段"""
        options = options or {}

        file_size = os.path.getsize(audio_path)
        duration = self._get_audio_duration(audio_path)
        logger.info(f"Aliyun ASR: {audio_path}, size={file_size/1024/1024:.2f}MB, duration={duration:.1f}s")

        max_duration = 180  # 3 分钟一段
        if duration <= max_duration:
            return await self._transcribe_single(audio_path)
        else:
            logger.info(f"Audio too long ({duration:.1f}s), splitting into {max_duration}s chunks")
            return await self._transcribe_chunked(audio_path, duration, max_duration)

    async def _transcribe_single(self, audio_path: str) -> TranscriptionResult:
        """转写单个音频文件"""
        with open(audio_path, 'rb') as f:
            audio_data = f.read()

        url = f"{self.base_url}?appkey={self.app_key}&format=mp3&sample_rate=16000"

        headers = {
            'X-NLS-Token': self._get_token(),
            'Content-Type': 'audio/mp3'
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"Calling Aliyun ASR: file_size={len(audio_data)}")
                response = await client.post(url, content=audio_data, headers=headers)

                logger.info(f"Aliyun ASR response: status={response.status_code}, body={response.text[:500]}")

                if response.status_code != 200:
                    raise Exception(f"HTTP error: {response.status_code}, body={response.text[:200]}")

                try:
                    result = response.json()
                except Exception as json_err:
                    response_text = response.text
                    logger.error(f"Failed to parse JSON response: {json_err}")
                    raise Exception(f"Invalid JSON response: {response_text[:200]}")

                if result.get('status') != 20000000:
                    if result.get('status') == 40000001:
                        logger.warning("Aliyun token expired, refreshing and retrying...")
                        self._token = None
                        self._token_expire = 0
                        headers['X-NLS-Token'] = self._get_token()
                        response = await client.post(url, content=audio_data, headers=headers)
                        result = response.json()
                        if result.get('status') != 20000000:
                            raise Exception(f"ASR retry failed: {result.get('message', 'Unknown error')}")
                    else:
                        raise Exception(f"ASR failed: {result.get('message', 'Unknown error')}")

                text = result.get('result', '')
                seg_duration = result.get('duration', 0) / 1000

                return TranscriptionResult(
                    text=text,
                    segments=[TranscriptionSegment(start=0, end=seg_duration, text=text)],
                    duration=seg_duration,
                    language="zh"
                )
        except Exception as e:
            logger.error(f"Aliyun ASR request failed: {e}", exc_info=True)
            raise

    async def _transcribe_chunked(self, audio_path: str, duration: float, chunk_duration: float) -> TranscriptionResult:
        """分段转写长音频"""
        import subprocess
        import tempfile

        all_text = []
        all_segments = []
        offset = 0.0
        chunk_idx = 0
        total_chunks = int(duration / chunk_duration) + 1

        with tempfile.TemporaryDirectory() as tmpdir:
            while offset < duration:
                chunk_path = os.path.join(tmpdir, f"chunk_{chunk_idx}.mp3")
                cmd = [
                    'ffmpeg', '-y', '-i', audio_path,
                    '-ss', str(offset), '-t', str(chunk_duration),
                    '-ar', '16000', '-ac', '1', '-b:a', '16k',
                    chunk_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                if result.returncode != 0:
                    logger.error(f"ffmpeg split failed: {result.stderr}")
                    offset += chunk_duration
                    chunk_idx += 1
                    continue

                logger.info(f"Transcribing chunk {chunk_idx+1}/{total_chunks}, offset={offset:.1f}s")
                chunk_result = await self._transcribe_single(chunk_path)

                if chunk_result.text:
                    all_text.append(chunk_result.text)
                    for seg in chunk_result.segments:
                        all_segments.append(TranscriptionSegment(
                            start=seg.start + offset,
                            end=seg.end + offset,
                            text=seg.text
                        ))

                offset += chunk_duration
                chunk_idx += 1

        return TranscriptionResult(
            text=''.join(all_text),
            segments=all_segments,
            duration=duration,
            language="zh"
        )

    def _get_audio_duration(self, audio_path: str) -> float:
        """获取音频时长（秒）"""
        import subprocess
        try:
            cmd = [
                'ffprobe', '-v', 'quiet',
                '-show_entries', 'format=duration',
                '-of', 'csv=p=0',
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return float(result.stdout.strip())
        except Exception as e:
            logger.warning(f"Failed to get audio duration: {e}")
        return 0
