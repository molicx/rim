from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from app.adapters.factory import create_adapter
from app.utils import URLExtractor
from app.services.file_parser import parse_file
from app.services.pdf_export import generate_pdf
from app.services.transcription import TranscriptionService
from app.adapters.asr import ASRFactory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RIM AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url_extractor = URLExtractor(timeout=15, max_retries=3)


class SummarizeRequest(BaseModel):
    text: str
    provider: str
    model: str
    api_key: str
    provider_type: Optional[str] = "native"
    base_url: Optional[str] = None
    length: Optional[str] = "standard"   # brief, standard, detailed
    style: Optional[str] = "points"      # points, paragraph, qa


class ExtractRequest(BaseModel):
    url: str


class ParseFileRequest(BaseModel):
    file_path: str
    file_type: str


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/v1/summarize")
async def summarize(request: SummarizeRequest):
    try:
        adapter = create_adapter(
            request.provider,
            request.api_key,
            request.model,
            request.provider_type,
            request.base_url
        )
        options = {
            'length': request.length or 'standard',
            'style': request.style or 'points',
        }
        result = await adapter.summarize(request.text, options)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@app.post("/api/v1/extract")
async def extract_text(request: ExtractRequest):
    """从 URL 提取文本内容"""
    try:
        logger.info(f"Extracting content from: {request.url}")
        result = url_extractor.extract(request.url)

        if not result['text'] or len(result['text']) < 100:
            raise HTTPException(
                status_code=400,
                detail="提取的文本内容过短。可能原因：1) 页面需要登录 2) 页面使用 JavaScript 动态渲染 3) 网站有反爬虫机制。建议直接复制文本内容进行总结。"
            )

        logger.info(f"Successfully extracted {len(result['text'])} characters")
        return {
            "text": result['text'],
            "title": result['title']
        }

    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        logger.error(f"Extraction failed for {request.url}: {error_msg}")

        # 提供更友好的错误信息
        if "JavaScript" in error_msg:
            detail = "页面使用 JavaScript 动态渲染，无法直接提取。建议：1) 直接复制文本内容 2) 尝试其他网页"
        elif "反爬虫" in error_msg or "Forbidden" in error_msg:
            detail = "网站有反爬虫机制，无法直接访问。建议直接复制文本内容进行总结。"
        else:
            detail = f"内容提取失败：{error_msg}。建议直接复制文本内容进行总结。"

        raise HTTPException(status_code=400, detail=detail)
    except Exception as e:
        logger.error(f"Extraction failed for {request.url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"内容提取失败: {str(e)}。建议直接复制文本内容进行总结。"
        )


@app.post("/api/v1/parse-file")
async def parse_file_endpoint(request: ParseFileRequest):
    """解析文件内容"""
    try:
        logger.info(f"Parsing file: {request.file_path}, type: {request.file_type}")
        text = parse_file(request.file_path, request.file_type)

        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="文件内容为空或无法解析"
            )

        logger.info(f"Successfully parsed {len(text)} characters")
        return {"text": text}

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Parse failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"文件解析失败: {str(e)}"
        )


class ExportPDFRequest(BaseModel):
    title: str
    summary: str
    key_points: list = []
    provider: str = ""
    model: str = ""
    created_at: str = ""
    source_url: str = ""


@app.post("/api/v1/export-pdf")
async def export_pdf(request: ExportPDFRequest):
    """导出 PDF"""
    try:
        pdf_bytes = generate_pdf(request.dict())
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{request.title}.pdf"'
            }
        )
    except Exception as e:
        logger.error(f"PDF export failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF 生成失败: {str(e)}")


# ==================== ASR 转写 API ====================

class TranscribeAPIRequest(BaseModel):
    task_id: int
    audio_path: str
    provider: str
    config: Dict[str, Any] = {}


@app.get("/api/v1/asr/providers")
async def list_asr_providers():
    """列出可用的 ASR 提供商"""
    providers = ASRFactory.list_providers()
    provider_info = {
        "xunfei": {
            "name": "讯飞开放平台",
            "icon": "🦊",
            "description": "中文识别准确率最高，支持多种方言",
            "fields": ["api_key", "api_secret", "app_id"],
        },
        "aliyun": {
            "name": "阿里云智能语音",
            "icon": "☁️",
            "description": "稳定可靠，支持实时识别",
            "fields": ["access_key_id", "access_key_secret", "app_key"],
        },
        "whisper": {
            "name": "OpenAI Whisper",
            "icon": "🤖",
            "description": "支持云端 API 和本地模型",
            "fields": ["api_key"],
        },
    }
    return {
        "providers": providers,
        "info": {k: v for k, v in provider_info.items() if k in providers},
    }


@app.post("/api/v1/transcribe")
async def transcribe_audio(request: TranscribeAPIRequest):
    """执行音频转写（供 Celery 或 Go 调用）"""
    try:
        service = TranscriptionService()

        # 验证音频文件
        is_valid, err_msg = service.validate_audio_file(request.audio_path)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

        # 转换为 WAV 格式（如果需要）
        audio_path = service.convert_to_wav(request.audio_path)

        # 执行转写
        result = await service.transcribe(
            audio_path,
            request.provider,
            request.config,
        )

        # 清理临时文件
        if audio_path != request.audio_path:
            import os
            os.remove(audio_path)

        return {
            "task_id": request.task_id,
            "status": "completed",
            "text": result.text,
            "segments": [
                {"start": s.start, "end": s.end, "text": s.text}
                for s in result.segments
            ],
            "duration": result.duration,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"转写失败: {str(e)}")


# ==================== Celery 异步转写 API ====================

class TranscribeAsyncRequest(BaseModel):
    task_id: int
    audio_path: str
    provider: str
    config: Dict[str, Any] = {}


@app.post("/api/v1/transcribe-async")
async def transcribe_async(request: TranscribeAsyncRequest):
    """提交异步转写任务到 Celery"""
    try:
        from app.tasks.audio_tasks import transcribe_audio_task

        # 提交 Celery 任务
        task = transcribe_audio_task.delay(
            request.task_id,
            request.audio_path,
            request.provider,
            request.config,
        )

        return {
            "task_id": request.task_id,
            "celery_task_id": task.id,
            "status": "processing",
        }
    except Exception as e:
        logger.error(f"Failed to submit async transcription: {e}")
        raise HTTPException(status_code=500, detail=f"提交转写任务失败: {str(e)}")


# ==================== 播客链接处理 API ====================

class TranscriptionCallbackRequest(BaseModel):
    task_id: int
    status: str
    text: str = ""
    segments: list = []
    duration: float = 0
    error: str = ""


@app.post("/api/v1/transcription-callback")
async def transcription_callback(request: TranscriptionCallbackRequest):
    """Celery 任务完成回调，更新转写结果到数据库"""
    import aiohttp
    import json

    # 调用 Go API 更新任务状态
    go_api_url = os.getenv("GO_API_URL", "http://go-api:3000")
    callback_data = {
        "task_id": request.task_id,
        "status": request.status,
        "result": request.text,
        "segments": json.dumps(request.segments) if request.segments else "",
        "duration": request.duration,
        "error": request.error,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{go_api_url}/internal/transcription-callback",
                json=callback_data,
            ) as resp:
                if resp.status != 200:
                    logger.error(f"Callback to Go API failed: {resp.status}")
    except Exception as e:
        logger.error(f"Callback error: {e}")

    return {"status": "ok"}


class ProcessPodcastRequest(BaseModel):
    url: str
    upload_dir: str = "/app/uploads"


@app.post("/api/v1/process-podcast")
async def process_podcast(request: ProcessPodcastRequest):
    """处理播客链接，下载音频文件"""
    try:
        from app.services.podcast import process_podcast_url

        result = await process_podcast_url(request.url, request.upload_dir)

        return {
            "audio_path": result["audio_path"],
            "title": result["title"],
            "url_type": result["url_type"],
            "source_url": result["source_url"],
            "filename": result.get("filename", ""),
            "size": result.get("size", 0),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Podcast processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"播客处理失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
