from typing import Dict, List
import google.generativeai as genai
from .base import AIModelAdapter


class GeminiAdapter(AIModelAdapter):
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    async def summarize(self, text: str, options: Dict = None) -> Dict:
        prompt = f"""请对以下文本进行总结，提取核心观点和要点：

{text}

请按以下格式输出：
1. 一段简洁的总结（100-200字）
2. 3-5个关键要点（每个要点一行）"""

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
