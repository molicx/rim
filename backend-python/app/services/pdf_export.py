"""
PDF 导出服务
使用纯 Python 生成简单 PDF
"""
import io
from datetime import datetime


def generate_pdf(data: dict) -> bytes:
    """生成 PDF 文件（简化版，使用基本 HTML 转 PDF）"""
    title = data.get('title', '总结')
    summary = data.get('summary', '')
    key_points = data.get('key_points', [])
    provider = data.get('provider', '')
    model = data.get('model', '')
    created_at = data.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M'))
    source_url = data.get('source_url', '')

    # 生成简单 HTML
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #333; }}
h1 {{ color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }}
.meta {{ color: #666; font-size: 14px; margin-bottom: 20px; }}
h2 {{ color: #333; margin-top: 30px; }}
.summary {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
.points {{ padding-left: 20px; }}
.points li {{ margin: 10px 0; }}
a {{ color: #1a73e8; }}
</style>
</head>
<body>
<h1>{title}</h1>
<div class="meta">
<p>生成时间: {created_at}</p>
<p>模型: {provider} - {model}</p>
</div>

<h2>总结</h2>
<div class="summary">
<p>{summary}</p>
</div>

<h2>关键要点</h2>
<ol class="points">
"""
    for point in key_points:
        html += f"<li>{point}</li>\n"

    html += "</ol>\n"

    if source_url:
        html += f'\n<h2>原文链接</h2>\n<p><a href="{source_url}">{source_url}</a></p>\n'

    html += "</body></html>"

    # 尝试使用 weasyprint，如果没有则返回 HTML
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        return pdf_bytes
    except ImportError:
        # 如果没有 weasyprint，返回 HTML 字节（前端可以处理）
        return html.encode('utf-8')
