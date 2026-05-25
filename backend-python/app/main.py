from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

from app.adapters.factory import create_adapter
from app.utils import URLExtractor
from app.services.file_parser import parse_file
from app.services.pdf_export import generate_pdf

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
