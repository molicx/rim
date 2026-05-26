"""
播客链接解析服务
支持：通用 URL、RSS 订阅链接
"""
import re
import logging
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# 支持的音频文件扩展名
AUDIO_EXTENSIONS = {'.mp3', '.mp4', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.wma'}

# 播客平台 PODCAST_PLATFORMS = {
#     'ximalaya': r'ximalaya\.com',
#     'lizhi': r'lizhi\.fm',
#     'netease': r'music\.163\.com',
# }


def detect_url_type(url: str) -> str:
    """检测 URL 类型"""
    parsed = urlparse(url)
    path = parsed.path.lower()
    netloc = parsed.netloc.lower()

    # 检查是否是直接的音频文件链接
    for ext in AUDIO_EXTENSIONS:
        if path.endswith(ext):
            return 'direct'

    # 检查是否是 RSS 链接（路径特征）
    if path.endswith('.rss') or path.endswith('.xml') or 'rss' in path or 'feed' in path:
        return 'rss'

    # 检查是否是已知的 RSS 生成服务
    rss_services = ['rsshub.app', 'rss.', 'feed.', 'podcast.']
    for service in rss_services:
        if service in netloc:
            return 'rss'

    # 检查 URL 参数中是否有 RSS 相关标识
    query = parsed.query.lower()
    if 'format=rss' in query or 'type=rss' in query or 'feed=' in query:
        return 'rss'

    # 默认当作通用 URL 处理
    return 'unknown'


async def fetch_rss_feed(url: str, timeout: int = 30) -> Dict:
    """
    获取并解析 RSS 订阅链接
    返回最新一期的音频信息
    """
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
            content = response.text

        # 解析 RSS XML
        import xml.etree.ElementTree as ET
        root = ET.fromstring(content)

        # 查找第一个 item（最新一期）
        # RSS 2.0 格式
        item = root.find('.//item')
        if item is None:
            # Atom 格式
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            item = root.find('.//atom:entry', ns)

        if item is None:
            raise ValueError("RSS 中未找到条目")

        # 提取信息
        title = item.findtext('title', default='未知标题')
        if not title:
            title = item.findtext('.//atom:title', default='未知标题')

        # 查找音频链接
        audio_url = None

        # RSS 2.0 enclosure
        enclosure = item.find('enclosure')
        if enclosure is not None:
            audio_url = enclosure.get('url')
            enclosure_type = enclosure.get('type', '')
            if audio_url and ('audio' in enclosure_type or not enclosure_type):
                pass  # 找到音频

        # 备用：查找 media:content
        if not audio_url:
            media = item.find('.//{http://search.yahoo.com/mrss/}content')
            if media is not None:
                audio_url = media.get('url')

        # Atom 格式 link
        if not audio_url:
            for link in item.findall('.//atom:link', {'atom': 'http://www.w3.org/2005/Atom'}):
                if link.get('rel') == 'enclosure' and 'audio' in link.get('type', ''):
                    audio_url = link.get('href')
                    break

        if not audio_url:
            raise ValueError("RSS 中未找到音频链接")

        return {
            'type': 'rss',
            'title': title.strip(),
            'audio_url': audio_url,
            'source_url': url,
        }

    except httpx.HTTPError as e:
        logger.error(f"RSS fetch error: {e}")
        raise ValueError(f"无法获取 RSS 内容: {e}")
    except ET.ParseError as e:
        logger.error(f"RSS parse error: {e}")
        raise ValueError(f"RSS 格式解析失败: {e}")


async def download_audio(url: str, upload_dir: str, timeout: int = 300) -> Tuple[str, Dict]:
    """
    下载音频文件
    返回: (本地文件路径, 元信息)
    """
    import os
    import uuid

    parsed = urlparse(url)
    filename = os.path.basename(parsed.path)
    if not filename or '.' not in filename:
        filename = f"{uuid.uuid4().hex}.mp3"

    # 确保文件名安全
    filename = re.sub(r'[^\w\-.]', '_', filename)
    filepath = os.path.join(upload_dir, "audio", filename)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream('GET', url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': f"{parsed.scheme}://{parsed.netloc}/",
            }) as response:
                response.raise_for_status()

                # 检查 Content-Type
                content_type = response.headers.get('Content-Type', '')
                content_length = response.headers.get('Content-Length')

                # 验证是否是音频类型
                if content_type and not any(t in content_type for t in ['audio', 'video', 'octet-stream', 'binary']):
                    logger.warning(f"Unexpected Content-Type: {content_type}")

                # 验证文件大小（最大 500MB）
                if content_length and int(content_length) > 500 * 1024 * 1024:
                    raise ValueError("音频文件超过 500MB 限制")

                # 写入文件
                downloaded_size = 0
                with open(filepath, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        downloaded_size += len(chunk)
                        if downloaded_size > 500 * 1024 * 1024:
                            raise ValueError("音频文件超过 500MB 限制")
                        f.write(chunk)

        return filepath, {
            'filename': filename,
            'size': downloaded_size,
            'content_type': content_type,
        }

    except httpx.HTTPError as e:
        # 清理部分下载的文件
        if os.path.exists(filepath):
            os.remove(filepath)
        raise ValueError(f"音频下载失败: {e}")


async def process_podcast_url(url: str, upload_dir: str) -> Dict:
    """
    处理播客链接
    1. 检测 URL 类型
    2. 如果是 RSS，解析获取音频 URL
    3. 下载音频文件
    返回音频文件信息
    """
    url_type = detect_url_type(url)
    logger.info(f"Processing podcast URL: {url}, type: {url_type}")

    result = {
        'source_url': url,
        'url_type': url_type,
    }

    if url_type == 'direct':
        # 直接下载音频
        filepath, meta = await download_audio(url, upload_dir)
        result.update({
            'audio_path': filepath,
            'title': meta['filename'],
            **meta,
        })

    elif url_type == 'rss':
        # 解析 RSS 获取音频链接
        rss_info = await fetch_rss_feed(url)
        audio_url = rss_info['audio_url']

        # 下载音频
        filepath, meta = await download_audio(audio_url, upload_dir)
        result.update({
            'audio_path': filepath,
            'title': rss_info['title'],
            'audio_url': audio_url,
            **meta,
        })

    else:
        # 未知类型，先尝试当作 RSS 解析
        try:
            rss_info = await fetch_rss_feed(url)
            audio_url = rss_info['audio_url']
            filepath, meta = await download_audio(audio_url, upload_dir)
            result.update({
                'audio_path': filepath,
                'title': rss_info['title'],
                'audio_url': audio_url,
                'url_type': 'rss',
                **meta,
            })
        except Exception:
            # RSS 解析失败，尝试直接下载
            try:
                filepath, meta = await download_audio(url, upload_dir)
                result.update({
                    'audio_path': filepath,
                    'title': meta['filename'],
                    'url_type': 'direct',
                    **meta,
                })
            except Exception as e:
                raise ValueError(f"无法处理该链接: {e}")

    return result
