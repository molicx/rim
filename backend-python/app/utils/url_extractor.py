"""
URL 内容提取模块
支持多种提取策略和错误处理
"""
import requests
from bs4 import BeautifulSoup
from readability import Document
import trafilatura
from typing import Optional, Dict
import logging
from urllib.parse import urlparse
import chardet

logger = logging.getLogger(__name__)


class URLExtractor:
    """URL 内容提取器"""

    def __init__(self, timeout: int = 15, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })

    def extract(self, url: str, method: str = 'auto') -> Dict[str, str]:
        """提取 URL 内容"""
        try:
            html_content = self._fetch_url(url)

            if method == 'auto':
                return self._extract_auto(html_content, url)
            elif method == 'trafilatura':
                return self._extract_trafilatura(html_content, url)
            elif method == 'readability':
                return self._extract_readability(html_content, url)
            else:
                return self._extract_basic(html_content)

        except Exception as e:
            logger.error(f"Failed to extract from {url}: {str(e)}")
            raise

    def _fetch_url(self, url: str) -> bytes:
        """获取 URL 内容"""
        last_error = None

        for attempt in range(self.max_retries):
            try:
                response = self.session.get(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True
                )
                response.raise_for_status()
                return response.content

            except requests.RequestException as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt < self.max_retries - 1:
                    continue

        raise last_error or Exception("Failed to fetch URL")

    def _detect_encoding(self, content: bytes) -> str:
        """检测内容编码"""
        result = chardet.detect(content)
        return result['encoding'] or 'utf-8'

    def _extract_auto(self, html_content: bytes, url: str) -> Dict[str, str]:
        """自动选择最佳提取方法"""
        try:
            result = self._extract_trafilatura(html_content, url)
            if result['text'] and len(result['text']) > 200:
                return result
        except Exception as e:
            logger.debug(f"Trafilatura failed: {str(e)}")

        try:
            result = self._extract_readability(html_content, url)
            if result['text'] and len(result['text']) > 200:
                return result
        except Exception as e:
            logger.debug(f"Readability failed: {str(e)}")

        return self._extract_basic(html_content)

    def _extract_trafilatura(self, html_content: bytes, url: str) -> Dict[str, str]:
        """使用 Trafilatura 提取"""
        text = trafilatura.extract(
            html_content,
            include_comments=False,
            include_tables=True,
            no_fallback=False,
            favor_precision=True,
            url=url
        )

        if not text:
            raise ValueError("Trafilatura extraction returned empty")

        metadata = trafilatura.extract_metadata(html_content)
        title = metadata.title if metadata else self._extract_title_basic(html_content)

        return {
            'text': self._clean_text(text),
            'title': title or 'Untitled'
        }

    def _extract_readability(self, html_content: bytes, url: str) -> Dict[str, str]:
        """使用 Readability 提取"""
        encoding = self._detect_encoding(html_content)
        html_str = html_content.decode(encoding, errors='ignore')

        doc = Document(html_str)
        title = doc.title()

        soup = BeautifulSoup(doc.summary(), 'lxml')
        text = soup.get_text(separator='\n', strip=True)

        if not text or len(text) < 100:
            raise ValueError("Readability extraction returned insufficient text")

        return {
            'text': self._clean_text(text),
            'title': title or 'Untitled'
        }

    def _extract_basic(self, html_content: bytes) -> Dict[str, str]:
        """基础提取方法（后备方案）"""
        encoding = self._detect_encoding(html_content)
        html_str = html_content.decode(encoding, errors='ignore')

        soup = BeautifulSoup(html_str, 'lxml')

        title = self._extract_title_basic(html_content)

        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe']):
            tag.decompose()

        article = soup.find('article')
        if article:
            text = article.get_text(separator='\n', strip=True)
        else:
            main = soup.find('main') or soup.find('div', class_=['content', 'article', 'post'])
            if main:
                text = main.get_text(separator='\n', strip=True)
            else:
                text = soup.get_text(separator='\n', strip=True)

        if not text or len(text) < 100:
            raise ValueError("Basic extraction returned insufficient text")

        return {
            'text': self._clean_text(text),
            'title': title or 'Untitled'
        }

    def _extract_title_basic(self, html_content: bytes) -> str:
        """提取标题"""
        try:
            encoding = self._detect_encoding(html_content)
            html_str = html_content.decode(encoding, errors='ignore')
            soup = BeautifulSoup(html_str, 'lxml')

            title_tag = soup.find('title')
            if title_tag:
                return title_tag.get_text().strip()

            h1 = soup.find('h1')
            if h1:
                return h1.get_text().strip()

            return 'Untitled'
        except Exception:
            return 'Untitled'

    def _clean_text(self, text: str) -> str:
        """清理文本"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)

        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')

        return text[:50000]
