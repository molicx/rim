from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

from app.adapters.factory import create_adapter
from app.utils import URLExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RIM AI Service", version="1.0.0")

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


class ExtractRequest(BaseModel):
    url: str


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
        result = await adapter.summarize(request.text)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@app.post("/api/v1/extract")
async def extract_text(request: ExtractRequest):
    """
    从 URL 提取文本内容
    使用多种提取策略确保最佳效果
    """
    try:
        logger.info(f"Extracting content from: {request.url}")
        result = url_extractor.extract(request.url, method='auto')

        if not result['text'] or len(result['text']) < 100:
            raise HTTPException(
                status_code=400,
                detail="提取的文本内容过短，可能是页面需要 JavaScript 渲染或内容被保护"
            )

        logger.info(f"Successfully extracted {len(result['text'])} characters")
        return {
            "text": result['text'],
            "title": result['title']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction failed for {request.url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"内容提取失败: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
