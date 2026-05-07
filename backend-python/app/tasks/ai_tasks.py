"""AI-related Celery tasks."""
from celery import Task
from app.tasks.celery_app import celery_app
from app.adapters.factory import create_adapter


class AITask(Task):
    """Base class for AI tasks with error handling."""

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3}
    retry_backoff = True
    retry_backoff_max = 600  # 10 minutes
    retry_jitter = True


@celery_app.task(base=AITask, name="app.tasks.ai_tasks.summarize_text")
def summarize_text(
    text: str,
    provider: str,
    api_key: str,
    model: str = None,
    provider_type: str = "native",
    base_url: str = None,
    options: dict = None
) -> dict:
    """
    异步文本总结任务

    Args:
        text: 要总结的文本
        provider: AI 提供商 (openai/claude/gemini/custom)
        api_key: API 密钥
        model: 模型名称
        provider_type: 提供商类型 (native/openai_compatible)
        base_url: 自定义 API 基础 URL
        options: 总结选项

    Returns:
        dict: 包含总结结果的字典
    """
    if options is None:
        options = {}

    # 创建适配器
    adapter = create_adapter(
        provider=provider,
        api_key=api_key,
        model=model,
        provider_type=provider_type,
        base_url=base_url
    )

    # 执行总结（注意：这里需要在同步上下文中运行异步代码）
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(adapter.summarize(text, options))
        return result
    finally:
        loop.close()


@celery_app.task(base=AITask, name="app.tasks.ai_tasks.extract_points")
def extract_points(
    text: str,
    provider: str,
    api_key: str,
    model: str = None,
    provider_type: str = "native",
    base_url: str = None
) -> list:
    """
    异步观点提取任务

    Args:
        text: 要提取观点的文本
        provider: AI 提供商
        api_key: API 密钥
        model: 模型名称
        provider_type: 提供商类型
        base_url: 自定义 API 基础 URL

    Returns:
        list: 提取的观点列表
    """
    adapter = create_adapter(
        provider=provider,
        api_key=api_key,
        model=model,
        provider_type=provider_type,
        base_url=base_url
    )

    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(adapter.extract_points(text))
        return result
    finally:
        loop.close()


@celery_app.task(base=AITask, name="app.tasks.ai_tasks.transcribe_audio")
def transcribe_audio(
    audio_path: str,
    provider: str = "openai",
    api_key: str = None,
    model: str = "whisper-1"
) -> dict:
    """
    异步音频转文字任务

    Args:
        audio_path: 音频文件路径
        provider: AI 提供商 (目前仅支持 openai)
        api_key: API 密钥
        model: Whisper 模型名称

    Returns:
        dict: 包含转录文本的字典
    """
    # TODO: 实现音频转文字逻辑
    # 这里需要使用 OpenAI Whisper API 或本地 Whisper 模型
    raise NotImplementedError("Audio transcription not yet implemented")
