"""
总结 Prompt 生成器
根据长度和风格参数生成不同的 prompt
"""

# 长度配置
LENGTH_CONFIG = {
    'brief': {
        'desc': '极简',
        'summary_words': '50字以内',
        'points_count': 3,
        'max_tokens': 300,
    },
    'standard': {
        'desc': '标准',
        'summary_words': '100-200字',
        'points_count': 5,
        'max_tokens': 800,
    },
    'detailed': {
        'desc': '详细',
        'summary_words': '300-500字',
        'points_count': 8,
        'max_tokens': 1500,
    },
}

# 风格配置
STYLE_CONFIG = {
    'points': {
        'desc': '要点式',
        'format': '请按以下格式输出：\n1. 一段简洁的总结（{summary_words}）\n2. {points_count}个关键要点（每个要点一行）',
    },
    'paragraph': {
        'desc': '段落式',
        'format': '请按以下格式输出：\n1. 一段完整的总结段落（{summary_words}）\n2. 用换行分隔的{points_count}个关键要点',
    },
    'qa': {
        'desc': '问答式',
        'format': '请按以下格式输出：\n1. 用一段话回答"这篇文章讲了什么？"（{summary_words}）\n2. 用3-{points_count}个问答形式列出核心观点（Q: ... A: ...）',
    },
}


def build_summarize_prompt(text: str, length: str = 'standard', style: str = 'points') -> str:
    """生成总结 prompt"""
    length_cfg = LENGTH_CONFIG.get(length, LENGTH_CONFIG['standard'])
    style_cfg = STYLE_CONFIG.get(style, STYLE_CONFIG['points'])

    format_desc = style_cfg['format'].format(
        summary_words=length_cfg['summary_words'],
        points_count=length_cfg['points_count'],
    )

    return f"""请对以下文本进行总结，提取核心观点和要点：

{text}

{format_desc}"""


def get_max_tokens(length: str = 'standard') -> int:
    """获取对应长度的 max_tokens"""
    cfg = LENGTH_CONFIG.get(length, LENGTH_CONFIG['standard'])
    return cfg['max_tokens']


def get_points_count(length: str = 'standard') -> int:
    """获取对应长度的要点数量"""
    cfg = LENGTH_CONFIG.get(length, LENGTH_CONFIG['standard'])
    return cfg['points_count']
