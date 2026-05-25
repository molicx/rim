import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { AIConfig } from '@/types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigAdded: () => void;
  configs: AIConfig[];
  editingConfig?: AIConfig | null;
  onEditConfig?: (config: AIConfig) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigAdded,
  configs,
  editingConfig,
  onEditConfig,
}) => {
  const [configType, setConfigType] = useState<'preset' | 'custom'>('preset');
  const [provider, setProvider] = useState('openai');
  const [_providerType, setProviderType] = useState('native');
  void _providerType;
  const [model, setModel] = useState('gpt-4');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const isEditMode = !!editingConfig;

  const presetProviders = [
    { value: 'openai', label: 'OpenAI', icon: '🟢', color: 'emerald' },
    { value: 'claude', label: 'Claude', icon: '🔵', color: 'blue' },
    { value: 'gemini', label: 'Gemini', icon: '🟡', color: 'amber' },
  ];

  const modelOptions: Record<string, { value: string; label: string }[]> = {
    openai: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    claude: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    ],
    gemini: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
    ],
  };

  useEffect(() => {
    if (editingConfig) {
      setProvider(editingConfig.provider);
      setProviderType(editingConfig.provider_type || 'native');
      setModel(editingConfig.model);
      setBaseUrl(editingConfig.base_url || '');
      setIsDefault(editingConfig.is_default);
      setConfigType(editingConfig.provider_type === 'openai_compatible' ? 'custom' : 'preset');
      setApiKey('');
    } else {
      setConfigType('preset');
      setProvider('openai');
      setProviderType('native');
      setModel('gpt-4');
      setBaseUrl('');
      setApiKey('');
      setIsDefault(false);
    }
    setError('');
    setShowApiKey(false);
  }, [editingConfig, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        provider,
        model,
        is_default: isDefault,
      };

      if (apiKey) {
        payload.api_key = apiKey;
      }

      if (configType === 'custom') {
        payload.provider_type = 'openai_compatible';
        if (baseUrl) {
          payload.base_url = baseUrl;
        }
      } else {
        payload.provider_type = 'native';
      }

      if (isEditMode && editingConfig) {
        await api.put(`/ai-configs/${editingConfig.id}`, payload);
      } else {
        if (!apiKey) {
          setError('请输入 API Key');
          setLoading(false);
          return;
        }
        await api.post('/ai-configs', payload);
      }

      setApiKey('');
      setBaseUrl('');
      onConfigAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || (isEditMode ? '更新配置失败' : '添加配置失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此配置吗？')) return;
    try {
      await api.delete(`/ai-configs/${id}`);
      onConfigAdded();
    } catch (err) {
      alert('删除失败');
    }
  };

  const getProviderIcon = (providerName: string) => {
    const p = providerName?.toLowerCase() || '';
    if (p.includes('openai') || p.includes('gpt')) return '🟢';
    if (p.includes('claude')) return '🔵';
    if (p.includes('gemini')) return '🟡';
    if (p.includes('deepseek')) return '🟣';
    if (p.includes('qwen') || p.includes('通义')) return '🟠';
    if (p.includes('ollama')) return '⚫';
    return '⚪';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditMode ? '编辑配置' : 'AI 模型配置'}
              </h2>
              <p className="text-xs text-slate-500">配置 AI 模型以使用总结功能</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 可滚动内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 已有配置列表 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">已有配置 ({configs.length})</h3>
            {configs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">暂无配置，请添加一个 AI 模型</p>
              </div>
            ) : (
              <div className="space-y-2">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getProviderIcon(config.provider)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-sm">{config.provider}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600 text-sm">{config.model}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {config.provider_type === 'openai_compatible' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                              自定义
                            </span>
                          )}
                          {config.is_default && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              默认
                            </span>
                          )}
                          {config.base_url && (
                            <span className="text-xs text-slate-400 truncate max-w-[200px]">
                              {config.base_url}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditConfig?.(config)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 添加/编辑配置表单 */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-medium text-slate-700 mb-4">
              {isEditMode ? '编辑配置' : '添加新配置'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 配置类型选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">配置类型</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfigType('preset');
                      setProvider('openai');
                      setModel('gpt-4');
                      setProviderType('native');
                      setBaseUrl('');
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      configType === 'preset'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${configType === 'preset' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-medium text-slate-900">预设模型</span>
                    </div>
                    <p className="text-xs text-slate-500">OpenAI / Claude / Gemini</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfigType('custom');
                      setProvider('');
                      setModel('');
                      setProviderType('openai_compatible');
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      configType === 'custom'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${configType === 'custom' ? 'bg-purple-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-medium text-slate-900">自定义模型</span>
                    </div>
                    <p className="text-xs text-slate-500">DeepSeek / Qwen / Ollama</p>
                  </button>
                </div>
              </div>

              {configType === 'preset' ? (
                <>
                  {/* 预设模型 - 提供商选择 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">AI 提供商</label>
                    <div className="grid grid-cols-3 gap-2">
                      {presetProviders.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            setProvider(p.value);
                            setModel(modelOptions[p.value][0].value);
                          }}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            provider === p.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xl">{p.icon}</span>
                          <p className="text-xs font-medium text-slate-700 mt-1">{p.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 模型选择 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">模型</label>
                    <div className="relative">
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer"
                      >
                        {modelOptions[provider]?.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 自定义模型 */}
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">支持任何 OpenAI 兼容的 API 接口</span>
                    </div>
                    <p className="text-xs text-purple-600 mt-1 ml-6">
                      如 DeepSeek、通义千问、Ollama、智谱 AI 等
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">提供商名称</label>
                    <input
                      type="text"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="例如: deepseek, qwen, ollama"
                    />
                    <p className="text-xs text-slate-400 mt-1">自定义名称，用于标识此配置</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">模型名称</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="例如: deepseek-chat, qwen-turbo"
                    />
                    <p className="text-xs text-slate-400 mt-1">API 调用时使用的模型标识符</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Base URL (可选)</label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="例如: https://api.deepseek.com/v1"
                    />
                    <p className="text-xs text-slate-400 mt-1">留空则使用默认 OpenAI 端点</p>
                  </div>
                </>
              )}

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  API Key {isEditMode && <span className="text-slate-400 font-normal">(留空则不修改)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required={!isEditMode}
                    className="w-full px-4 py-2.5 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={isEditMode ? '留空则不修改' : '输入 API Key'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 设为默认 */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-700 cursor-pointer">
                  设为默认配置
                </label>
              </div>

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isEditMode ? '更新中...' : '添加中...'}
                  </span>
                ) : (
                  isEditMode ? '更新配置' : '添加配置'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
