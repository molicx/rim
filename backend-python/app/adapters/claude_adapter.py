from typing import Dict, List
from anthropic import AsyncAnthropic
from .base import AIModelAdapter
from .prompts import build_summarize_prompt, get_max_tokens


class ClaudeAdapter(AIModelAdapter):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def summarize(self, text: str, options: Dict = None) -> Dict:
        options = options or {}
        length = options.get('length', 'standard')
        style = options.get('style', 'points')

        prompt = build_summarize_prompt(text, length, style)
        max_tokens = get_max_tokens(length)

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        content = response.content[0].text
        return self._parse_summary(content)

    async def extract_points(self, text: str) -> List[str]:
        prompt = f"""请从以下文本中提取3-5个最重要的观点或要点：

{text}

请以列表形式输出，每个要点一行。"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=500,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        content = response.content[0].text
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
