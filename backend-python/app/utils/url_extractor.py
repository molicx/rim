"""
URL 内容提取模块
使用 BeautifulSoup 进行网页内容提取，无需额外编译依赖
"""
import requests
from bs4 import BeautifulSoup
from typing import Dict
import logging
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

    def extract(self, url: str) -> Dict[str, str]:
        """提取 URL 内容"""
        html_content = self._fetch_url(url)
        return self._parse_html(html_content)

    def _fetch_url(self, url: str) -> str:
        """获取 URL 内容"""
        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
                response.raise_for_status()
                encoding = chardet.detect(response.content)['encoding'] or 'utf-8'
                return response.content.decode(encoding, errors='ignore')
            except requests.RequestException as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
        raise last_error or Exception("Failed to fetch URL")

    def _parse_html(self, html: str) -> Dict[str, str]:
        """解析 HTML 提取正文"""
        soup = BeautifulSoup(html, 'html.parser')

        # 提取标题
        title = self._extract_title(soup)

        # 移除无关标签
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript']):
            tag.decompose()

        # 优先提取 article 标签
        article = soup.find('article')
        if article:
            text = article.get_text(separator='\n', strip=True)
            if len(text) > 200:
                return {'text': self._clean_text(text), 'title': title}

        # 尝试 main 标签
        main = soup.find('main')
        if main:
            text = main.get_text(separator='\n', strip=True)
            if len(text) > 200:
                return {'text': self._clean_text(text), 'title': title}

        # 尝试常见内容区域
        for selector in ['div.content', 'div.article', 'div.post', 'div.entry', '#content', '#article']:
            content = soup.select_one(selector)
            if content:
                text = content.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    return {'text': self._clean_text(text), 'title': title}

        # 最后尝试 body
        body = soup.find('body')
        if body:
            text = body.get_text(separator='\n', strip=True)
            if len(text) > 100:
                return {'text': self._clean_text(text), 'title': title}

        raise ValueError("无法提取有效内容")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """提取页面标题"""
        # 优先 og:title
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            return og_title['content'].strip()

        # title 标签
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text().strip()

        # h1 标签
        h1 = soup.find('h1')
        if h1:
            return h1.get_text().strip()

        return 'Untitled'

    def _clean_text(self, text: str) -> str:
        """清理文本"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        # 合并多余空行
        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')
        return text[:50000]
