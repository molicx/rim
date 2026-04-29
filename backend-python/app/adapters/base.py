from abc import ABC, abstractmethod
from typing import Dict, List


class AIModelAdapter(ABC):
    @abstractmethod
    async def summarize(self, text: str, options: Dict = None) -> Dict:
        pass

    @abstractmethod
    async def extract_points(self, text: str) -> List[str]:
        pass
