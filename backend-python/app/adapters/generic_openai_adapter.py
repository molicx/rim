from typing import Dict, List
from openai import AsyncOpenAI
from .base import AIModelAdapter
from .prompts import build_summarize_prompt, get_max_tokens


class GenericOpenAIAdapter(AIModelAdapter):
    """通用 OpenAI 兼容适配器，支持任何兼容 OpenAI API 的服务"""

    def __init__(self, api_key: str, model: str, base_url: str = None):
        self.model = model
        if base_url:
            self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        else:
            self.client = AsyncOpenAI(api_key=api_key)

    async def summarize(self, text: str, options: Dict = None) -> Dict:
        options = options or {}
        length = options.get('length', 'standard')
        style = options.get('style', 'points')

        prompt = build_summarize_prompt(text, length, style)
        max_tokens = get_max_tokens(length)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "你是一个专业的内容总结助手，擅长提炼文章和播客的核心观点。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=max_tokens
        )

        content = response.choices[0].message.content
        return self._parse_summary(content)

    async def extract_points(self, text: str) -> List[str]:
        prompt = f"""请从以下文本中提取3-5个最重要的观点或要点：

{text}

请以列表形式输出，每个要点一行。"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "你是一个专业的内容分析助手。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )

        content = response.choices[0].message.content
        points = [line.strip().lstrip('0123456789.-) ') for line in content.split('\n') if line.strip()]
        return points[:5]

    def _parse_summary(self, content: str) -> Dict:
        lines = content.split('\n')
        summary = ""
        key_points = []

        in_points = False
        for line in lines:
            line = line.strip()
            if not line:
                continue

            if any(line.startswith(str(i)) for i in range(1, 10)) or line.startswith('-') or line.startswith('•'):
                in_points = True
                point = line.lstrip('0123456789.-•) ').strip()
                if point:
                    key_points.append(point)
            elif not in_points:
                summary += line + " "

        return {
            "summary": summary.strip(),
            "key_points": key_points if key_points else ["总结完成"]
        }
