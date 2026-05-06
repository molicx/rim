from .openai_adapter import OpenAIAdapter
from .claude_adapter import ClaudeAdapter
from .gemini_adapter import GeminiAdapter
from .generic_openai_adapter import GenericOpenAIAdapter


def create_adapter(
    provider: str,
    api_key: str,
    model: str = None,
    provider_type: str = "native",
    base_url: str = None
):
    """
    创建 AI 模型适配器

    Args:
        provider: 提供商名称 (openai, claude, gemini, custom)
        api_key: API 密钥
        model: 模型名称
        provider_type: 提供商类型 (native, openai_compatible)
        base_url: 自定义 API 端点 (仅用于 openai_compatible)
    """
    provider = provider.lower()

    # OpenAI 兼容接口 - 使用通用适配器
    if provider_type == "openai_compatible":
        if not model:
            raise ValueError("Model is required for OpenAI compatible providers")
        return GenericOpenAIAdapter(api_key, model, base_url)

    # 原生接口
    if provider == "openai":
        return OpenAIAdapter(api_key, model or "gpt-4")
    elif provider == "claude":
        return ClaudeAdapter(api_key, model or "claude-3-5-sonnet-20241022")
    elif provider == "gemini":
        return GeminiAdapter(api_key, model or "gemini-pro")
    else:
        # 未知 provider，尝试作为 OpenAI 兼容接口
        if not model:
            raise ValueError(f"Model is required for custom provider: {provider}")
        return GenericOpenAIAdapter(api_key, model, base_url)
