"""
阿里云智能语音交互 ASR 适配器
使用录音文件识别接口（异步），支持长音频
"""
import hashlib
import hmac
import json
import os
import time
import uuid
from base64 import encodebytes
from typing import Dict, Optional
from urllib.parse import quote, urlencode

import httpx

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
        self.oss_upload_timeout = config.get('oss_upload_timeout', 600)
        # OSS 配置（优先使用 env，其次使用 access_key 同源配置）
        self.oss_access_key_id = os.getenv('OSS_ACCESS_KEY_ID', self.access_key_id)
        self.oss_access_key_secret = os.getenv('OSS_ACCESS_KEY_SECRET', self.access_key_secret)
        self.oss_bucket = os.getenv('OSS_BUCKET', '')
        self.oss_endpoint = os.getenv('OSS_ENDPOINT', f'oss-{self.region}.aliyuncs.com')
        self.oss_region = os.getenv('OSS_REGION', self.region)
        if not self.oss_bucket:
            logger.warning("OSS_BUCKET not configured, Aliyun ASR will fail")
        # 录音文件识别 API 域名
        self.filetrans_domain = f"filetrans.{self.region}.aliyuncs.com"

    def validate_config(self, config: Dict) -> bool:
        return bool(
            config.get('access_key_id') and
            config.get('access_key_secret') and
            config.get('app_key')
        )

    def _sign(self, params: dict, method: str = 'POST') -> str:
        """阿里云 POP API 签名"""
        params['Format'] = 'JSON'
        params['AccessKeyId'] = self.access_key_id
        params['SignatureMethod'] = 'HMAC-SHA1'
        params['SignatureVersion'] = '1.0'
        params['SignatureNonce'] = uuid.uuid4().hex
        params['Timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

        sorted_params = sorted(params.items())
        canonical_query = urlencode(sorted_params, quote_via=lambda s, *a, **k: quote(str(s), safe='~'))
        string_to_sign = f"{method}&%2F&{quote(canonical_query, safe='~')}"
        key = (self.access_key_secret + '&').encode('utf-8')
        signature = encodebytes(hmac.new(key, string_to_sign.encode('utf-8'), hashlib.sha1).digest()).decode('utf-8').strip()

        params['Signature'] = signature
        return urlencode(params)

    def _upload_to_oss(self, audio_path: str) -> tuple:
        """上传音频文件到 OSS，返回公开可读的 URL"""
        try:
            import oss2
        except ImportError:
            raise ImportError("oss2 is required. Install: pip install oss2")

        file_size = os.path.getsize(audio_path)
        logger.info(f"Uploading to OSS: {audio_path}, size={file_size/1024/1024:.2f}MB, endpoint={self.oss_endpoint}")

        auth = oss2.Auth(self.oss_access_key_id, self.oss_access_key_secret)
        bucket = oss2.Bucket(auth, self.oss_endpoint, self.oss_bucket, timeout=self.oss_upload_timeout)
        object_key = f"asr-temp/{uuid.uuid4().hex}.mp3"
        try:
            bucket.put_object_from_file(object_key, audio_path)
        except Exception as e:
            logger.error(f"OSS upload failed: {e}")
            raise

        # 生成带签名的临时访问 URL（有效期 1 小时）
        url = bucket.sign_url('GET', object_key, 3600, slash_safe=False)
        logger.info(f"OSS upload done, size={file_size/1024/1024:.2f}MB, url={url[:120]}...")
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
        file_size_mb = os.path.getsize(audio_path) / 1024 / 1024
        logger.info(f"Aliyun ASR: {audio_path}, size={file_size_mb:.2f}MB")

        oss_url, object_key = self._upload_to_oss(audio_path)
        try:
            task_id = await self._submit_task(oss_url)
            return await self._poll_result(task_id)
        finally:
            self._cleanup_oss(object_key)

    async def _submit_task(self, audio_url: str) -> str:
        """提交录音文件识别任务"""
        url = f"https://{self.filetrans_domain}/"

        params = {
            'Action': 'SubmitTask',
            'Version': '2018-08-17',
            'AppKey': self.app_key,
            'FileLink': audio_url,
            'ServiceVersion': '4.0',
            'EnablePunctuationPrediction': 'true',
            'EnableInverseTextNormalization': 'true',
            'EnableSampleRateAdaptive': 'true',
        }

        body = self._sign(params, 'POST')

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                content=body,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            logger.info(f"Submit response: status={response.status_code}, body={response.text[:500]}")

            if response.status_code != 200:
                raise Exception(f"Submit failed: {response.status_code}, body={response.text[:200]}")

            result = response.json()
            status_code = result.get('StatusCode')
            if status_code != 21050000:
                raise Exception(f"Submit failed: {result.get('StatusText', f'StatusCode={status_code}')}")

            return result['TaskId']

    async def _poll_result(self, task_id: str, max_wait: int = 600, interval: int = 5) -> TranscriptionResult:
        """轮询识别结果"""
        import asyncio
        url = f"https://{self.filetrans_domain}/"
        start_time = time.time()

        while time.time() - start_time < max_wait:
            params = {
                'Action': 'GetTaskResult',
                'Version': '2018-08-17',
                'TaskId': task_id,
            }
            query_string = self._sign(params, 'GET')

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{url}?{query_string}")
                logger.info(f"Poll response: status={response.status_code}, body={response.text[:300]}")

                if response.status_code != 200:
                    raise Exception(f"Poll failed: {response.status_code}")

                result = response.json()
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
