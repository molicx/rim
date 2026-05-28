"""
ASR 转写服务
统一管理语音识别任务
"""
import os
import logging
from typing import Dict, Optional

from app.adapters.asr import ASRFactory, TranscriptionResult

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

    def convert_for_asr(self, audio_path: str, max_size_mb: int = 2) -> str:
        """
        预处理音频文件：格式标准化（单声道 16kHz MP3）
        对于超过 max_size_mb 的文件，不做整体压缩，交由 ASR 适配器分段处理。
        :param audio_path: 原始音频文件路径
        :param max_size_mb: 最大文件大小（MB）
        :return: 处理后的文件路径
        """
        import subprocess

        file_size = os.path.getsize(audio_path)
        max_size = max_size_mb * 1024 * 1024
        logger.info(f"Audio file size: {file_size/1024/1024:.2f}MB")

        # 小文件直接返回，无需转换
        if file_size <= max_size:
            logger.info(f"Audio file within limit ({max_size_mb}MB), skip conversion")
            return audio_path

        # 检查 ffmpeg 是否可用
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, timeout=5)
        except FileNotFoundError:
            logger.error("ffmpeg not installed")
            raise ValueError(f"音频文件过大({file_size/1024/1024:.1f}MB)，但 ffmpeg 未安装")
        except Exception:
            pass

        # 大文件仅做格式转换（单声道 16kHz），不压缩到 2MB
        # 分段压缩由 ASR 适配器处理
        converted_path = audio_path.rsplit('.', 1)[0] + '_converted.mp3'
        cmd = [
            'ffmpeg', '-y',
            '-i', audio_path,
            '-acodec', 'libmp3lame',
            '-ac', '1',
            '-ar', '16000',
            '-b:a', '64k',
            converted_path
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                logger.warning(f"ffmpeg conversion warning: {result.stderr[:300]}")
                return audio_path

            if not os.path.exists(converted_path):
                return audio_path

            converted_size = os.path.getsize(converted_path)
            logger.info(f"Audio converted: {file_size/1024/1024:.2f}MB -> {converted_size/1024/1024:.2f}MB")
            return converted_path

        except Exception as e:
            logger.warning(f"Audio conversion failed: {e}, using original file")
            return audio_path
