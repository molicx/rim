"""
ASR (Automatic Speech Recognition) 适配器模块
支持多平台语音识别：讯飞、阿里云、腾讯云、百度、火山引擎、OpenAI Whisper
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionSegment:
    """转写片段"""
    start: float  # 开始时间（秒）
    end: float    # 结束时间（秒）
    text: str     # 转写文本


@dataclass
class TranscriptionResult:
    """转写结果"""
    text: str                          # 完整转写文本
    segments: List[TranscriptionSegment]  # 分段结果
    duration: float                    # 音频时长（秒）
    language: str = "zh"               # 语言


class ASRProvider(ABC):
    """语音识别提供商基类"""

    @abstractmethod
    async def transcribe(self, audio_path: str, options: Dict = None) -> TranscriptionResult:
        """
        转写音频文件
        :param audio_path: 音频文件路径
        :param options: 额外选项
        :return: 转写结果
        """
        pass

    @abstractmethod
    def validate_config(self, config: Dict) -> bool:
        """验证配置是否有效"""
        pass


class ASRFactory:
    """ASR 工厂类"""

    _providers = {}

    @classmethod
    def register(cls, name: str, provider_class):
        """注册提供商"""
        cls._providers[name] = provider_class
        logger.info(f"Registered ASR provider: {name}")

    @classmethod
    def create(cls, name: str, config: Dict) -> ASRProvider:
        """
        创建 ASR 提供商实例
        :param name: 提供商名称
        :param config: 配置信息
        :return: ASRProvider 实例
        """
        if name not in cls._providers:
            raise ValueError(
                f"Unknown ASR provider: {name}. "
                f"Available: {list(cls._providers.keys())}"
            )

        provider = cls._providers[name](config)
        if not provider.validate_config(config):
            raise ValueError(f"Invalid config for ASR provider: {name}")

        return provider

    @classmethod
    def list_providers(cls) -> List[str]:
        """列出所有可用提供商"""
        return list(cls._providers.keys())


# 导入并注册各平台适配器
def register_all_providers():
    """注册所有 ASR 提供商"""
    try:
        from .xfyun_asr import XunfeiASR
        ASRFactory.register('xunfei', XunfeiASR)
    except ImportError as e:
        logger.warning(f"Failed to register XunfeiASR: {e}")

    try:
        from .aliyun_asr import AliyunASR
        ASRFactory.register('aliyun', AliyunASR)
    except ImportError as e:
        logger.warning(f"Failed to register AliyunASR: {e}")

    try:
        from .whisper_asr import WhisperASR
        ASRFactory.register('whisper', WhisperASR)
    except ImportError as e:
        logger.warning(f"Failed to register WhisperASR: {e}")


# 自动注册
register_all_providers()
