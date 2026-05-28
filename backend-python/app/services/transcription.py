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

    def convert_to_wav(self, audio_path: str) -> str:
        """
        将音频转换为 WAV 格式（16kHz, 16bit, 单声道）
        同时压缩文件大小以适应 ASR 接口限制（最大 2MB）
        :return: 转换后的文件路径
        """
        import subprocess

        output_path = audio_path.rsplit('.', 1)[0] + '_converted.wav'

        # 获取原始文件时长
        duration = self.get_audio_duration(audio_path)

        # 计算目标比特率以确保文件小于 2MB
        # 2MB = 16777216 bits, 目标比特率 = 16777216 / duration
        max_size_bits = 2 * 1024 * 1024 * 8  # 2MB in bits
        if duration > 0:
            target_bitrate = int(max_size_bits / duration * 0.9)  # 留 10% 余量
            target_bitrate = max(target_bitrate, 8000)  # 最低 8kbps
            target_bitrate = min(target_bitrate, 128000)  # 最高 128kbps
        else:
            target_bitrate = 64000

        logger.info(f"Converting audio: duration={duration:.1f}s, target_bitrate={target_bitrate}")

        # 先尝试用 Opus 编码（压缩率高）
        cmd = [
            'ffmpeg', '-y',
            '-i', audio_path,
            '-acodec', 'libopus',
            '-ac', '1',
            '-ar', '16000',
            '-b:a', f'{target_bitrate}',
            '-vbr', 'on',
            output_path.replace('.wav', '.opus')
        ]

        try:
            result = subprocess.run(cmd, check=True, capture_output=True)
            converted_path = output_path.replace('.wav', '.opus')
            converted_size = os.path.getsize(converted_path)
            logger.info(f"Audio converted: {converted_path}, size={converted_size / 1024 / 1024:.2f}MB")
            return converted_path
        except subprocess.CalledProcessError as e:
            logger.error(f"Opus conversion failed: {e.stderr.decode() if e.stderr else 'unknown'}")
        except FileNotFoundError:
            logger.warning("ffmpeg not found")

        # 回退到 WAV 格式
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
            logger.error(f"WAV conversion failed: {e.stderr.decode() if e.stderr else 'unknown'}")
            return audio_path  # 转换失败返回原文件
        except FileNotFoundError:
            logger.warning("ffmpeg not found, using original audio file")
            return audio_path
