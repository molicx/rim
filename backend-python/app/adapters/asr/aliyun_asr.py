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
        # OSS 配置（从环境变量读取）
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

    def _sign(self, params: dict) -> dict:
        """阿里云 POP API 签名"""
        # 添加公共参数
        params['Format'] = 'JSON'
        params['Version'] = '2018-08-17'
        params['AccessKeyId'] = self.access_key_id
        params['SignatureMethod'] = 'HMAC-SHA1'
        params['SignatureVersion'] = '1.0'
        params['SignatureNonce'] = uuid.uuid4().hex
        params['Timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

        # 排序并编码
        sorted_params = sorted(params.items())
        canonical_query = urlencode(sorted_params, quote_via=lambda s, *a, **k: quote(str(s), safe=''))

        # 签名字符串
        string_to_sign = f"POST&%2F&{quote(canonical_query, safe='')}"

        # HMAC-SHA1 签名
        key = (self.access_key_secret + '&').encode('utf-8')
        signature = encodebytes(hmac.new(key, string_to_sign.encode('utf-8'), hashlib.sha1).digest()).decode('utf-8').strip()

        params['Signature'] = signature
        return params

    def _upload_to_oss(self, audio_path: str) -> tuple:
        """上传音频文件到 OSS，返回 (临时 URL, object_key)"""
        try:
            import oss2
        except ImportError:
            raise ImportError("oss2 is required. Install: pip install oss2")

        auth = oss2.Auth(self.oss_access_key_id, self.oss_access_key_secret)
        bucket = oss2.Bucket(auth, self.oss_endpoint, self.oss_bucket)

        object_key = f"asr-temp/{uuid.uuid4().hex}.mp3"
        logger.info(f"Uploading {audio_path} to oss://{self.oss_bucket}/{object_key}")

        bucket.put_object_from_file(object_key, audio_path)

        # 生成临时访问 URL（有效期 1 小时）
        url = bucket.sign_url('GET', object_key, 3600)
        logger.info(f"OSS upload done, url={url[:100]}...")
        return url, object_key

    def _cleanup_oss(self, object_key: str):
        """清理 OSS 临时文件"""
        try:
            import oss2
            auth = oss2.Auth(self.oss_access_key_id, self.oss_access_key_secret)
            bucket = oss2.Bucket(auth, self.oss_endpoint, self.oss_bucket)
            bucket.delete_object(object_key)
            logger.info(f"Deleted oss://{self.oss_bucket}/{object_key}")
        except Exception as e:
            logger.warning(f"Failed to cleanup OSS file: {e}")

    async def transcribe(self, audio_path: str, options: dict = None) -> TranscriptionResult:
        """转写音频文件（录音文件识别，异步接口）"""
        options = options or {}

        file_size = os.path.getsize(audio_path)
        logger.info(f"Aliyun ASR file transcription: {audio_path}, size={file_size/1024/1024:.2f}MB")

        # 1. 上传音频到 OSS
        oss_url, object_key = self._upload_to_oss(audio_path)

        try:
            # 2. 提交识别任务
            task_id = await self._submit_task(oss_url)
            logger.info(f"ASR task submitted: task_id={task_id}")

            # 3. 轮询识别结果
            result = await self._poll_result(task_id)
            logger.info(f"ASR task completed: text_length={len(result.text)}")

            return result
        finally:
            # 4. 清理 OSS 临时文件
            self._cleanup_oss(object_key)

    async def _submit_task(self, audio_url: str) -> str:
        """提交录音文件识别任务"""
        url = f"https://{self.filetrans_domain}/"

        params = {
            'Action': 'SubmitTask',
            'AppKey': self.app_key,
            'FileLink': audio_url,
            'EnablePunctuationPrediction': 'true',
            'EnableInverseTextNormalization': 'true',
            'EnableSampleRateAdaptive': 'true',
        }

        signed_params = self._sign(params)
        body = urlencode(signed_params)

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
        url = f"https://{self.filetrans_domain}/"
        start_time = time.time()

        while time.time() - start_time < max_wait:
            params = {
                'Action': 'GetTaskResult',
                'TaskId': task_id,
            }
            signed_params = self._sign(params)
            query_string = urlencode(signed_params)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{url}?{query_string}")
                logger.info(f"Poll response: status={response.status_code}, body={response.text[:300]}")

                if response.status_code != 200:
                    raise Exception(f"Poll failed: {response.status_code}")

                result = response.json()
                status_code = result.get('StatusCode')

                if status_code == 21050000:  # SUCCESS
                    sentences = result.get('Result', {}).get('Sentences', [])
                    text = ' '.join(s.get('Text', '') for s in sentences)
                    segments = [
                        TranscriptionSegment(
                            start=s.get('BeginTime', 0) / 1000,
                            end=s.get('EndTime', 0) / 1000,
                            text=s.get('Text', '')
                        )
                        for s in sentences
                    ]
                    duration = result.get('BizDuration', 0) / 1000
                    return TranscriptionResult(
                        text=text,
                        segments=segments,
                        duration=duration,
                        language="zh"
                    )
                elif status_code in (21050001, 21050002):  # RUNNING or QUEUEING
                    logger.info(f"Task status: {result.get('StatusText')}, waiting...")
                elif status_code == 21050003:  # SUCCESS_WITH_NO_VALID_FRAGMENT
                    return TranscriptionResult(text="", segments=[], duration=0, language="zh")
                else:
                    raise Exception(f"Task failed: {result.get('StatusText', f'StatusCode={status_code}')}")

            import asyncio
            await asyncio.sleep(interval)

        raise TimeoutError(f"ASR task timeout after {max_wait}s")
