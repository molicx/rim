from .openai_adapter import OpenAIAdapter
from .claude_adapter import ClaudeAdapter
from .gemini_adapter import GeminiAdapter


def create_adapter(provider: str, api_key: str, model: str = None):
    provider = provider.lower()

    if provider == "openai":
        return OpenAIAdapter(api_key, model or "gpt-4")
    elif provider == "claude":
        return ClaudeAdapter(api_key, model or "claude-3-5-sonnet-20241022")
    elif provider == "gemini":
        return GeminiAdapter(api_key, model or "gemini-pro")
    else:
        raise ValueError(f"Unsupported provider: {provider}")
