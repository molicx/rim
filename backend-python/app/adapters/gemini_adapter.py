from typing import Dict, List
import google.generativeai as genai
from .base import AIModelAdapter
from .prompts import build_summarize_prompt


class GeminiAdapter(AIModelAdapter):
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    async def summarize(self, text: str, options: Dict = None) -> Dict:
        options = options or {}
        length = options.get('length', 'standard')
        style = options.get('style', 'points')

        prompt = build_summarize_prompt(text, length, style)
        response = await self.model.generate_content_async(prompt)
        content = response.text
        return self._parse_summary(content)

    async def extract_points(self, text: str) -> List[str]:
        prompt = f"""请从以下文本中提取3-5个最重要的观点或要点：

{text}

请以列表形式输出，每个要点一行。"""

        response = await self.model.generate_content_async(prompt)
        content = response.text
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
