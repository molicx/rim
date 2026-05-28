"""
阿里云智能语音交互 ASR 适配器
文档: https://help.aliyun.com/zh/isi/developer-reference/api-nls-cloud-gateway
"""
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

        # 如果获取时长失败（0），默认使用分段模式（安全降级）
        max_duration = 180  # 3 分钟一段
        if duration > 0 and duration <= max_duration:
            logger.info(f"Audio <= {max_duration}s, using single request")
            return await self._transcribe_single(audio_path)
        else:
            # 时长未知或超长，使用分段模式
            effective_duration = duration if duration > 0 else (file_size / (64000 / 8))  # 按 64kbps 估算
            logger.info(f"Audio > {max_duration}s or unknown duration ({duration}s), using chunked mode, estimated={effective_duration:.1f}s")
            return await self._transcribe_chunked(audio_path, effective_duration, max_duration)

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
        failed_chunks = []

        logger.info(f"Splitting {duration:.1f}s audio into {total_chunks} chunks of {chunk_duration:.0f}s each")

        with tempfile.TemporaryDirectory() as tmpdir:
            while offset < duration:
                chunk_path = os.path.join(tmpdir, f"chunk_{chunk_idx}.mp3")
                # 3分钟 64kbps ≈ 1.4MB，安全地在 2MB 限制内
                cmd = [
                    'ffmpeg', '-y', '-i', audio_path,
                    '-ss', str(offset), '-t', str(chunk_duration),
                    '-acodec', 'libmp3lame', '-ac', '1', '-ar', '16000',
                    '-b:a', '64k',
                    chunk_path
                ]
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                if proc.returncode != 0:
                    logger.error(f"ffmpeg chunk split failed at offset {offset}s: {proc.stderr[:300]}")
                    failed_chunks.append(chunk_idx + 1)
                    offset += chunk_duration
                    chunk_idx += 1
                    continue

                if not os.path.exists(chunk_path) or os.path.getsize(chunk_path) == 0:
                    logger.warning(f"Chunk {chunk_idx+1} is empty, skipping")
                    failed_chunks.append(chunk_idx + 1)
                    offset += chunk_duration
                    chunk_idx += 1
                    continue

                chunk_size = os.path.getsize(chunk_path)
                logger.info(f"Transcribing chunk {chunk_idx+1}/{total_chunks}, offset={offset:.1f}s, size={chunk_size/1024:.0f}KB")

                try:
                    chunk_result = await self._transcribe_single(chunk_path)
                    if chunk_result.text:
                        all_text.append(chunk_result.text)
                        for seg in chunk_result.segments:
                            all_segments.append(TranscriptionSegment(
                                start=seg.start + offset,
                                end=seg.end + offset,
                                text=seg.text
                            ))
                    logger.info(f"Chunk {chunk_idx+1}/{total_chunks} done, got {len(chunk_result.text)} chars")
                except Exception as e:
                    logger.error(f"Chunk {chunk_idx+1}/{total_chunks} failed: {e}")
                    failed_chunks.append(chunk_idx + 1)

                offset += chunk_duration
                chunk_idx += 1

        if failed_chunks:
            logger.warning(f"Failed chunks: {failed_chunks}")
        if not all_text:
            raise Exception("All chunks failed, no transcription result")

        logger.info(f"All {chunk_idx} chunks done, failed={len(failed_chunks)}, total text: {len(''.join(all_text))} chars, {len(all_segments)} segments")
        return TranscriptionResult(
            text=''.join(all_text),
            segments=all_segments,
            duration=duration,
            language="zh"
        )

    def _get_audio_duration(self, audio_path: str) -> float:
        """获取音频时长（秒），ffprobe 失败时用 ffmpeg 回退"""
        import subprocess
        try:
            cmd = [
                'ffprobe', '-v', 'quiet',
                '-show_entries', 'format=duration',
                '-of', 'csv=p=0',
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                d = float(result.stdout.strip())
                if d > 0:
                    return d
        except Exception as e:
            logger.warning(f"ffprobe failed: {e}, trying ffmpeg fallback")

        try:
            cmd = [
                'ffmpeg', '-i', audio_path,
                '-f', 'null', '-'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            # ffmpeg 输出到 stderr
            for line in result.stderr.split('\n'):
                if 'Duration' in line:
                    # 提取 HH:MM:SS.ss
                    import re
                    m = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.\d+)', line)
                    if m:
                        h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
                        return h * 3600 + mi * 60 + s
        except Exception as e:
            logger.warning(f"ffmpeg fallback also failed: {e}")
        return 0
