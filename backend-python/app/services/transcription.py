"""
ASR 转写服务
统一管理语音识别任务
"""
import os
import uuid
from typing import Dict, Optional

from . import ASRFactory, TranscriptionResult

import logging

logger = logging.getLogger(__name__)


class TranscriptionService:
    """转写服务"""

    def __init__(self, upload_dir: str = "/app/uploads"):
        self.upload_dir = upload_dir

    async def transcribe(
        self,
        audio_path: str,
        provider_name: str,
        provider_config: Dict,
        options: Dict = None
    ) -> TranscriptionResult:
        """
        转写音频
        :param audio_path: 音频文件路径
        :param provider_name: ASR 提供商名称
        :param provider_config: 提供商配置
        :param options: 额外选项
        :return: 转写结果
        """
        # 创建 ASR 提供商实例
        provider = ASRFactory.create(provider_name, provider_config)

        # 执行转写
        result = await provider.transcribe(audio_path, options)

        logger.info(
            f"Transcription completed: provider={provider_name}, "
            f"duration={result.duration:.1f}s, text_length={len(result.text)}"
        )

        return result

    def get_audio_duration(self, audio_path: str) -> float:
        """获取音频时长（秒）"""
        try:
            import mutagen
            audio = mutagen.File(audio_path)
            return audio.info.length if audio and audio.info else 0
        except ImportError:
            # 如果 mutagen 不可用，返回估算值
            file_size = os.path.getsize(audio_path)
            return file_size / (16000 * 2)  # 假设 16kHz, 16bit

    def validate_audio_file(self, audio_path: str) -> tuple:
        """
        验证音频文件
        :return: (is_valid, error_message)
        """
        if not os.path.exists(audio_path):
            return False, "音频文件不存在"

        # 检查文件扩展名
        ext = os.path.splitext(audio_path)[1].lower()
        supported_formats = ['.mp3', '.mp4', '.wav', '.m4a', '.flac', '.ogg', '.aac']
        if ext not in supported_formats:
            return False, f"不支持的音频格式: {ext}，支持: {', '.join(supported_formats)}"

        # 检查文件大小（最大 500MB）
        max_size = 500 * 1024 * 1024
        file_size = os.path.getsize(audio_path)
        if file_size > max_size:
            return False, f"音频文件过大: {file_size / 1024 / 1024:.1f}MB，最大支持 500MB"

        return True, ""

    def convert_to_wav(self, audio_path: str) -> str:
        """
        将音频转换为 WAV 格式（16kHz, 16bit, 单声道）
        :return: 转换后的文件路径
        """
        import subprocess

        output_path = audio_path.rsplit('.', 1)[0] + '_converted.wav'

        cmd = [
            'ffmpeg', '-y',
            '-i', audio_path,
            '-acodec', 'pcm_s16le',
            '-ac', '1',
            '-ar', '16000',
            output_path
        ]

        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Audio conversion failed: {e.stderr.decode()}")
            return audio_path  # 转换失败返回原文件
        except FileNotFoundError:
            logger.warning("ffmpeg not found, using original audio file")
            return audio_path
