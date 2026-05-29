"""
阿里云智能语音交互 ASR 适配器
使用录音文件识别接口（异步），支持长音频
"""
import json
import os
import time
import uuid
from typing import Dict, Optional

import httpx
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

from . import ASRProvider, TranscriptionResult, TranscriptionSegment

import logging

logger = logging.getLogger(__name__)


class AliyunASR(ASRProvider):
    """阿里云语音识别适配器（录音文件识别）"""

    def __init__(self, config: Dict):
        self.access_key_id = config.get('access_key_id', '')
        self.access_key_secret = config.get('access_key_secret', '')
        self.app_key = config.get('app_key', '')
        self.region = config.get('region', 'cn-shanghai')
        self._client = AcsClient(
            self.access_key_id,
            self.access_key_secret,
            self.region
        )
        # OSS 配置
        self.oss_access_key_id = os.getenv('OSS_ACCESS_KEY_ID', self.access_key_id)
        self.oss_access_key_secret = os.getenv('OSS_ACCESS_KEY_SECRET', self.access_key_secret)
        self.oss_bucket = os.getenv('OSS_BUCKET', '')
        self.oss_endpoint = os.getenv('OSS_ENDPOINT', f'oss-{self.region}.aliyuncs.com')
        self.oss_region = os.getenv('OSS_REGION', self.region)
        # 录音文件识别 API 域名
        self.filetrans_domain = f"filetrans.{self.region}.aliyuncs.com"

    def validate_config(self, config: Dict) -> bool:
        return bool(
            config.get('access_key_id') and
            config.get('access_key_secret') and
            config.get('app_key')
        )

    def _upload_to_oss(self, audio_path: str) -> tuple:
        """上传音频文件到 OSS"""
        try:
            import oss2
        except ImportError:
            raise ImportError("oss2 is required. Install: pip install oss2")

        auth = oss2.Auth(self.oss_access_key_id, self.oss_access_key_secret)
        bucket = oss2.Bucket(auth, self.oss_endpoint, self.oss_bucket)
        object_key = f"asr-temp/{uuid.uuid4().hex}.mp3"
        bucket.put_object_from_file(object_key, audio_path)
        url = bucket.sign_url('GET', object_key, 3600)
        return url, object_key

    def _cleanup_oss(self, object_key: str):
        """清理 OSS 临时文件"""
        try:
            import oss2
            auth = oss2.Auth(self.oss_access_key_id, self.oss_access_key_secret)
            bucket = oss2.Bucket(auth, self.oss_endpoint, self.oss_bucket)
            bucket.delete_object(object_key)
        except Exception as e:
            logger.warning(f"Failed to cleanup OSS: {e}")

    async def transcribe(self, audio_path: str, options: dict = None) -> TranscriptionResult:
        """转写音频文件"""
        options = options or {}
        logger.info(f"Aliyun ASR: {audio_path}, size={os.path.getsize(audio_path)/1024/1024:.2f}MB")

        oss_url, object_key = self._upload_to_oss(audio_path)
        try:
            task_id = await self._submit_task(oss_url)
            return await self._poll_result(task_id)
        finally:
            self._cleanup_oss(object_key)

    async def _submit_task(self, audio_url: str) -> str:
        """提交录音文件识别任务"""
        request = CommonRequest()
        request.set_method('POST')
        request.set_domain(self.filetrans_domain)
        request.set_version('2018-08-17')
        request.set_action_name('SubmitTask')
        request.add_body_params('AppKey', self.app_key)
        request.add_body_params('FileLink', audio_url)
        request.add_body_params('EnablePunctuationPrediction', 'true')
        request.add_body_params('EnableInverseTextNormalization', 'true')
        request.add_body_params('EnableSampleRateAdaptive', 'true')

        response = self._client.do_action_with_exception(request)
        result = json.loads(response)
        logger.info(f"Submit response: {json.dumps(result, ensure_ascii=False)[:300]}")

        if result.get('StatusCode') != 21050000:
            raise Exception(f"Submit failed: {result.get('StatusText', 'Unknown')}")
        return result['TaskId']

    async def _poll_result(self, task_id: str, max_wait: int = 600, interval: int = 5) -> TranscriptionResult:
        """轮询识别结果"""
        import asyncio
        start_time = time.time()

        while time.time() - start_time < max_wait:
            request = CommonRequest()
            request.set_method('GET')
            request.set_domain(self.filetrans_domain)
            request.set_version('2018-08-17')
            request.set_action_name('GetTaskResult')
            request.add_query_param('TaskId', task_id)

            response = self._client.do_action_with_exception(request)
            result = json.loads(response)
            logger.info(f"Poll response: {json.dumps(result, ensure_ascii=False)[:300]}")

            status_code = result.get('StatusCode')
            if status_code == 21050000:
                sentences = result.get('Result', {}).get('Sentences', [])
                text = ' '.join(s.get('Text', '') for s in sentences)
                segments = [TranscriptionSegment(
                    start=s.get('BeginTime', 0) / 1000,
                    end=s.get('EndTime', 0) / 1000,
                    text=s.get('Text', '')
                ) for s in sentences]
                return TranscriptionResult(text=text, segments=segments,
                                           duration=result.get('BizDuration', 0) / 1000, language="zh")
            elif status_code in (21050001, 21050002):
                logger.info(f"Task {result.get('StatusText')}, waiting...")
            elif status_code == 21050003:
                return TranscriptionResult(text="", segments=[], duration=0, language="zh")
            else:
                raise Exception(f"Task failed: {result.get('StatusText', status_code)}")

            await asyncio.sleep(interval)

        raise TimeoutError(f"ASR timeout after {max_wait}s")
