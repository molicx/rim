"""
URL 内容提取模块
增强版：支持反爬虫、多编码、智能内容提取、JavaScript 渲染
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
import logging
import random

# 尝试导入 requests_html 用于 JavaScript 渲染
try:
    from requests_html import HTMLSession
    HAS_REQUESTS_HTML = True
except ImportError:
    HAS_REQUESTS_HTML = False

logger = logging.getLogger(__name__)

# 常见浏览器 User-Agent 列表
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

# 常见内容区域选择器（按优先级排序）
CONTENT_SELECTORS = [
    # 语义化标签
    'article',
    'main',
    '[role="main"]',
    # 常见 class/id
    '.post-content',
    '.article-content',
    '.entry-content',
    '.post-body',
    '.article-body',
    '.content-body',
    '.story-body',
    '.rich-text',
    '.markdown-body',
    '#content',
    '#article',
    '#post',
    '#main-content',
    '.content',
    '.article',
    '.post',
    '.entry',
    # 中文网站常见
    '.article_content',
    '.post_content',
    '.content_detail',
    '.text-content',
    '#article_content',
    '#content_detail',
    '.read-content',
    '.article-detail',
    '.news-content',
    '.detail-content',
]

# 需要移除的标签
REMOVE_TAGS = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    'iframe', 'noscript', 'svg', 'form', 'button', 'input',
    '.ad', '.ads', '.advertisement', '.banner',
    '.sidebar', '.side-bar', '.widget',
    '.comment', '.comments', '#comments',
    '.related', '.recommend', '.share',
    '.breadcrumb', '.pagination',
    '.header', '.footer', '.nav', '.navigation',
    '.social', '.meta', '.author-info',
]

# 需要移除的属性
REMOVE_ATTRS = ['class', 'id', 'style', 'onclick', 'onload']


class URLExtractor:
    """增强版 URL 内容提取器"""

    def __init__(self, timeout: int = 20, max_retries: int = 3, render_js: bool = False):
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.render_js = render_js and HAS_REQUESTS_HTML
        if self.render_js:
            self.html_session = HTMLSession()
            # 设置 Chromium 路径（如果需要）
            import os
            os.environ['PYPPETEER_CHROMIUM_REVISION'] = 'latest'

    def _get_headers(self, url: str) -> Dict[str, str]:
        """生成请求头"""
        parsed = requests.utils.urlparse(url)
        return {
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'Referer': f"{parsed.scheme}://{parsed.netloc}/",
        }

    def extract(self, url: str, allow_js_render: bool = True) -> Dict[str, str]:
        """提取 URL 内容"""
        try:
            html_content = self._fetch_url(url)
            result = self._parse_html(html_content)
            # 检查提取的文本是否足够长
            if len(result.get('text', '')) < 200 and allow_js_render and self.render_js:
                logger.info(f"文本过短({len(result.get('text', ''))}字符)，尝试 JavaScript 渲染...")
                return self._extract_with_js(url)
            return result
        except ValueError as e:
            # 如果是 JavaScript 渲染页面，并且允许 JS 渲染
            if "JavaScript" in str(e) and allow_js_render and self.render_js:
                logger.info(f"检测到 JavaScript 渲染页面，尝试 JS 渲染...")
                return self._extract_with_js(url)
            raise

    def _fetch_url(self, url: str) -> str:
        """获取 URL 内容，带重试和编码处理"""
        last_error = None

        for attempt in range(self.max_retries):
            try:
                headers = self._get_headers(url)
                response = self.session.get(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True,
                    headers=headers
                )
                response.raise_for_status()

                # 智能编码检测
                encoding = self._detect_encoding(response)
                content = response.content.decode(encoding, errors='replace')

                # 检查是否是有效 HTML
                if not self._is_valid_html(content):
                    logger.warning(f"Response may not be valid HTML for {url}")

                return content

            except requests.HTTPError as e:
                last_error = e
                if e.response.status_code == 403:
                    logger.warning(f"403 Forbidden for {url}, attempt {attempt + 1}")
                elif e.response.status_code == 429:
                    logger.warning(f"429 Rate limited for {url}, attempt {attempt + 1}")
                else:
                    raise
            except requests.RequestException as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")

        raise last_error or Exception(f"Failed to fetch URL after {self.max_retries} attempts")

    def _extract_with_js(self, url: str) -> Dict[str, str]:
        """使用 JavaScript 渲染提取内容"""
        if not HAS_REQUESTS_HTML:
            raise ValueError("requests_html 未安装，无法进行 JavaScript 渲染。请安装: pip install requests-html")
        
        try:
            logger.info(f"使用 JavaScript 渲染提取: {url}")
            response = self.html_session.get(url, timeout=self.timeout * 2)  # JS 渲染需要更多时间
            
            # 渲染 JavaScript
            response.html.render(timeout=20, sleep=2)  # 等待 JS 执行
            
            # 获取渲染后的 HTML
            html_content = response.html.html
            
            # 解析渲染后的内容
            return self._parse_html(html_content)
            
        except Exception as e:
            logger.error(f"JavaScript 渲染失败: {e}")
            raise ValueError(f"JavaScript 渲染失败: {str(e)}")

    def _detect_encoding(self, response: requests.Response) -> str:
        """智能编码检测"""
        # 1. 从 Content-Type 头获取
        content_type = response.headers.get('Content-Type', '')
        match = re.search(r'charset=([^\s;]+)', content_type, re.IGNORECASE)
        if match:
            encoding = match.group(1).strip('"\'')
            if encoding.lower() != 'iso-8859-1':  # 忽略默认编码
                return encoding

        # 2. 从 HTML meta 标签获取
        if response.content:
            # 先尝试用 apparent_encoding
            if response.apparent_encoding:
                return response.apparent_encoding

            # 从内容中检测
            content_sample = response.content[:4096].decode('ascii', errors='ignore')
            # meta charset
            match = re.search(r'<meta[^>]+charset=["\']?([^"\'\s>]+)', content_sample, re.IGNORECASE)
            if match:
                return match.group(1)
            # meta http-equiv
            match = re.search(r'content=["\'][^"\']*charset=([^"\'\s;]+)', content_sample, re.IGNORECASE)
            if match:
                return match.group(1)

        # 3. 默认 UTF-8
        return 'utf-8'

    def _is_valid_html(self, content: str) -> bool:
        """检查是否是有效 HTML"""
        content_lower = content.lower().strip()
        return (
            content_lower.startswith('<!doctype html') or
            content_lower.startswith('<html') or
            '<body' in content_lower[:2000]
        )

    def _parse_html(self, html: str) -> Dict[str, str]:
        """解析 HTML 提取正文"""
        soup = BeautifulSoup(html, 'html.parser')

        # 提取标题
        title = self._extract_title(soup)

        # 移除无关元素
        self._remove_noise(soup)

        # 尝试提取内容
        result = self._extract_content(soup)

        if result:
            text, source = result
            logger.info(f"Extracted {len(text)} chars from {source}")
            return {'text': self._clean_text(text), 'title': title}

        # 最后尝试：从 body 提取
        body = soup.find('body')
        if body:
            text = body.get_text(separator='\n', strip=True)
            if len(text) > 100:
                logger.info(f"Extracted {len(text)} chars from body (fallback)")
                return {'text': self._clean_text(text), 'title': title}

        # 检查是否是 JS 渲染页面
        if self._is_js_rendered(soup):
            raise ValueError("页面需要 JavaScript 渲染，无法直接提取内容")

        raise ValueError("无法提取有效内容，页面结构可能不标准")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """提取页面标题"""
        # 1. og:title
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            return og_title['content'].strip()

        # 2. twitter:title
        twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
        if twitter_title and twitter_title.get('content'):
            return twitter_title['content'].strip()

        # 3. title 标签
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().strip()
            # 清理常见后缀
            for suffix in [' - 知乎', ' - 新浪', ' - 搜狐', ' - 网易', ' - 腾讯网',
                           ' | 36氪', ' | 虎嗅', ' - 少数派', ' - 爱范儿',
                           '_百度百科', ' - 维基百科', ' - Wiki']:
                if title.endswith(suffix):
                    title = title[:-len(suffix)].strip()
            if title:
                return title

        # 4. h1 标签
        h1 = soup.find('h1')
        if h1:
            return h1.get_text().strip()

        # 5. 第一个 h2
        h2 = soup.find('h2')
        if h2:
            return h2.get_text().strip()

        return 'Untitled'

    def _remove_noise(self, soup: BeautifulSoup):
        """移除无关元素"""
        # 移除标签
        for tag_name in REMOVE_TAGS:
            if tag_name.startswith('.'):
                # class 选择器
                for tag in soup.find_all(class_=tag_name[1:]):
                    tag.decompose()
            elif tag_name.startswith('#'):
                # id 选择器
                tag = soup.find(id=tag_name[1:])
                if tag:
                    tag.decompose()
            else:
                # 标签名
                for tag in soup.find_all(tag_name):
                    tag.decompose()

        # 移除隐藏元素
        for tag in soup.find_all(style=re.compile(r'display:\s*none|visibility:\s*hidden')):
            tag.decompose()

        # 移除空标签（保留 img、br 等）
        for tag in soup.find_all():
            if tag.name in ('img', 'br', 'hr', 'input'):
                continue
            if not tag.get_text(strip=True) and not tag.find('img'):
                tag.decompose()

    def _extract_content(self, soup: BeautifulSoup) -> Optional[tuple]:
        """尝试多种方式提取内容，返回 (text, source) 或 None"""

        # 1. 尝试所有 CSS 选择器
        for selector in CONTENT_SELECTORS:
            elements = soup.select(selector)
            if elements:
                # 选择内容最多的元素
                best = max(elements, key=lambda e: len(e.get_text(strip=True)))
                text = best.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    return (text, f"selector: {selector}")

        # 2. 基于文本密度的智能提取
        result = self._density_based_extraction(soup)
        if result:
            return result

        # 3. 尝试所有 div，找内容最长的
        divs = soup.find_all('div')
        if divs:
            # 过滤太小的 div
            valid_divs = [d for d in divs if len(d.get_text(strip=True)) > 300]
            if valid_divs:
                best = max(valid_divs, key=lambda d: len(d.get_text(strip=True)))
                text = best.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    return (text, "largest div")

        return None

    def _density_based_extraction(self, soup: BeautifulSoup) -> Optional[tuple]:
        """基于文本密度的内容提取算法"""
        candidates = []

        for tag in soup.find_all(['div', 'section', 'td']):
            text = tag.get_text(strip=True)
            text_len = len(text)

            if text_len < 200:
                continue

            # 计算文本密度
            tag_count = len(tag.find_all())
            if tag_count == 0:
                density = text_len
            else:
                density = text_len / tag_count

            # 计算链接密度（链接多的可能是导航）
            link_text = sum(len(a.get_text(strip=True)) for a in tag.find_all('a'))
            link_ratio = link_text / text_len if text_len > 0 else 1

            # 链接密度太高，跳过
            if link_ratio > 0.5:
                continue

            # 计算得分
            score = density * (1 - link_ratio) * (text_len / 1000)
            candidates.append((tag, text, score))

        if candidates:
            # 选择得分最高的
            best = max(candidates, key=lambda c: c[2])
            if best[2] > 0.5:  # 最低得分阈值
                return (best[1], "density-based")

        return None

    def _is_js_rendered(self, soup: BeautifulSoup) -> bool:
        """检测是否是 JS 渲染页面"""
        # 检查 body 内容是否过少
        body = soup.find('body')
        if body:
            text = body.get_text(strip=True)
            if len(text) < 100:
                return True

        # 检查是否有明显的 JS 框架标记
        html_text = str(soup).lower()
        js_indicators = [
            'id="app"',
            'id="root"',
            'ng-app',
            'v-cloak',
            '__NEXT_DATA__',
            '__NUXT__',
            'data-reactroot',
            'vue-router',
        ]
        for indicator in js_indicators:
            if indicator in html_text:
                return True

        # 检查 script 标签是否远多于内容
        scripts = soup.find_all('script')
        content_tags = soup.find_all(['p', 'h1', 'h2', 'h3', 'article', 'section'])
        if len(scripts) > 10 and len(content_tags) < 3:
            return True

        return False

    def _clean_text(self, text: str) -> str:
        """清理文本"""
        # 移除特殊字符
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

        # 按行处理
        lines = []
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue

            # 过滤太短的行（可能是导航、按钮等）
            if len(line) < 3 and not re.match(r'^[\d\.\-\*•]+$', line):
                continue

            # 过滤常见噪音
            noise_patterns = [
                r'^分享到',
                r'^收藏',
                r'^点赞',
                r'^评论',
                r'^关注',
                r'^相关推荐',
                r'^热门文章',
                r'^推荐阅读',
                r'^版权声明',
                r'^免责声明',
                r'^责任编辑',
                r'^来源[:：]',
                r'^原标题[:：]',
                r'^责任编辑[:：]',
            ]
            is_noise = False
            for pattern in noise_patterns:
                if re.match(pattern, line):
                    is_noise = True
                    break
            if is_noise:
                continue

            lines.append(line)

        text = '\n'.join(lines)

        # 合并多余空行
        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')

        return text[:50000]
