import React, { useState } from 'react';
import api from '@/services/api';
import { AIConfig } from '@/types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigAdded: () => void;
  configs: AIConfig[];
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigAdded,
  configs,
}) => {
  const [configType, setConfigType] = useState<'preset' | 'custom'>('preset');
  const [provider, setProvider] = useState('openai');
  const [providerType, setProviderType] = useState('native');
  const [model, setModel] = useState('gpt-4');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 调试：组件加载时输出状态
  React.useEffect(() => {
    console.log('ConfigModal mounted, configType:', configType);
  }, []);

  const presetProviders = ['openai', 'claude', 'gemini'];
  const modelOptions: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo'],
    claude: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    gemini: ['gemini-pro', 'gemini-pro-vision'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        provider,
        model,
        api_key: apiKey,
        is_default: isDefault,
      };

      if (configType === 'custom') {
        payload.provider_type = 'openai_compatible';
        if (baseUrl) {
          payload.base_url = baseUrl;
        }
      } else {
        payload.provider_type = 'native';
      }

      await api.post('/ai-configs', payload);
      setApiKey('');
      setBaseUrl('');
      onConfigAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '添加配置失败');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">AI 模型配置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">已有配置</h3>
          {configs.length === 0 ? (
            <p className="text-gray-500">暂无配置</p>
          ) : (
            <div className="space-y-2">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                <div>
                  <div>
                    <span className="font-medium">{config.provider}</span>
                    <span className="text-gray-500 ml-2">{config.model}</span>
                    {config.provider_type === 'openai_compatible' && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        自定义
                      </span>
                    )}
                    {config.is_default && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        默认
                      </span>
                    )}
                  </div>
                  {config.base_url && (
                    <div className="text-xs text-gray-400 mt-1">
                      {config.base_url}
                    </div>
                  )}
                </div>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">添加新配置</h3>

          {/* 调试信息 */}
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
            <strong>调试信息:</strong> configType = {configType}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-500 p-3 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                配置类型
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="configType"
                    value="preset"
                    checked={configType === 'preset'}
                    onChange={() => {
                      setConfigType('preset');
                      setProvider('openai');
                      setModel('gpt-4');
                      setProviderType('native');
                      setBaseUrl('');
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">预设模型 (OpenAI/Claude/Gemini)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="configType"
                    value="custom"
                    checked={configType === 'custom'}
                    onChange={() => {
                      setConfigType('custom');
                      setProvider('');
                      setModel('');
                      setProviderType('openai_compatible');
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">自定义模型 (DeepSeek/Qwen/Ollama等)</span>
                </label>
              </div>
            </div>

            {configType === 'preset' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI 提供商
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      setModel(modelOptions[e.target.value][0]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="claude">Claude</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {modelOptions[provider].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>自定义模型</strong>：支持任何 OpenAI 兼容的 API 接口
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    如 DeepSeek、通义千问、Ollama、智谱 AI 等
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    提供商名称
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如: deepseek, qwen, ollama"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    自定义名称，用于标识此配置
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如: deepseek-chat, qwen-turbo"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    API 调用时使用的模型标识符
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Base URL (可选)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如: https://api.deepseek.com/v1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    留空则使用默认 OpenAI 端点
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入 API Key"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                设为默认配置
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '添加中...' : '添加配置'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
