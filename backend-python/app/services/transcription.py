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
        压缩音频文件以适应 ASR 接口大小限制
        :param audio_path: 原始音频文件路径
        :param max_size_mb: 最大文件大小（MB）
        :return: 压缩后的文件路径
        """
        import subprocess

        file_size = os.path.getsize(audio_path)
        max_size = max_size_mb * 1024 * 1024

        if file_size <= max_size:
            logger.info(f"Audio file size OK: {file_size/1024/1024:.2f}MB <= {max_size_mb}MB")
            return audio_path

        logger.info(f"Audio file too large: {file_size/1024/1024:.2f}MB > {max_size_mb}MB, compressing...")

        # 获取音频时长
        duration = self.get_audio_duration(audio_path)
        logger.info(f"Audio duration: {duration:.1f}s")

        # 计算目标比特率
        if duration > 0:
            target_bitrate = int((max_size * 8) / duration * 0.85)  # 留 15% 余量
            target_bitrate = max(target_bitrate, 8000)   # 最低 8kbps
            target_bitrate = min(target_bitrate, 128000)  # 最高 128kbps
        else:
            target_bitrate = 32000

        logger.info(f"Target bitrate: {target_bitrate}bps")

        # 压缩音频
        compressed_path = audio_path.rsplit('.', 1)[0] + '_compressed.mp3'
        cmd = [
            'ffmpeg', '-y',
            '-i', audio_path,
            '-acodec', 'libmp3lame',
            '-ac', '1',
            '-ar', '16000',
            '-b:a', f'{target_bitrate}',
            compressed_path
        ]

        # 检查 ffmpeg 是否可用
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, timeout=5)
        except FileNotFoundError:
            logger.error("ffmpeg not installed")
            raise ValueError(f"音频文件过大({file_size/1024/1024:.1f}MB)，但 ffmpeg 未安装，无法压缩")
        except Exception as e:
            logger.warning(f"ffmpeg check failed: {e}")

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                logger.error(f"ffmpeg error: {result.stderr[:500]}")
                raise Exception(f"ffmpeg failed: {result.stderr[:200]}")

            if not os.path.exists(compressed_path):
                raise Exception("Compressed file not created")

            compressed_size = os.path.getsize(compressed_path)
            logger.info(f"Audio compressed: {file_size/1024/1024:.2f}MB -> {compressed_size/1024/1024:.2f}MB")

            # 如果压缩后仍然太大，尝试更低比特率
            if compressed_size > max_size:
                logger.warning(f"Compressed file still too large ({compressed_size/1024/1024:.2f}MB), trying lower bitrate...")
                compressed_path2 = audio_path.rsplit('.', 1)[0] + '_compressed2.mp3'
                cmd2 = [
                    'ffmpeg', '-y',
                    '-i', audio_path,
                    '-acodec', 'libmp3lame',
                    '-ac', '1',
                    '-ar', '16000',
                    '-b:a', '16000',  # 16kbps
                    compressed_path2
                ]
                subprocess.run(cmd2, check=True, capture_output=True, timeout=120)
                compressed_size2 = os.path.getsize(compressed_path2)
                logger.info(f"Second compression: {compressed_size2/1024/1024:.2f}MB")
                compressed_path = compressed_path2
                compressed_size = compressed_size2

            return compressed_path

        except Exception as e:
            logger.error(f"Audio compression failed: {e}")
            # 清理临时文件
            for p in [compressed_path, compressed_path2] if 'compressed_path2' in dir() else [compressed_path]:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except:
                    pass
            raise ValueError(f"音频文件过大({file_size/1024/1024:.1f}MB)，压缩失败: {e}")
