from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import requests
from bs4 import BeautifulSoup

from app.adapters.factory import create_adapter

app = FastAPI(title="RIM AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SummarizeRequest(BaseModel):
    text: str
    provider: str
    model: str
    api_key: str
<<<<<<< HEAD
    provider_type: Optional[str] = "native"
    base_url: Optional[str] = None
=======
>>>>>>> ae3b01c4e8af0e6d305322a4556d7b23639ac717


class ExtractRequest(BaseModel):
    url: str


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/v1/summarize")
async def summarize(request: SummarizeRequest):
    try:
<<<<<<< HEAD
        adapter = create_adapter(
            request.provider,
            request.api_key,
            request.model,
            request.provider_type,
            request.base_url
        )
=======
        adapter = create_adapter(request.provider, request.api_key, request.model)
>>>>>>> ae3b01c4e8af0e6d305322a4556d7b23639ac717
        result = await adapter.summarize(request.text)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@app.post("/api/v1/extract")
async def extract_text(request: ExtractRequest):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(request.url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
            script.decompose()

        article = soup.find('article')
        if article:
            text = article.get_text(separator='\n', strip=True)
        else:
            main = soup.find('main') or soup.find('div', class_=['content', 'article', 'post'])
            if main:
                text = main.get_text(separator='\n', strip=True)
            else:
                text = soup.get_text(separator='\n', strip=True)

        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)

        if len(text) < 100:
            raise HTTPException(status_code=400, detail="Extracted text too short")

        return {"text": text[:50000]}

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
