import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AIConfig, Summary } from '@/types';

const Dashboard: React.FC = () => {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedConfig, setSelectedConfig] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');

  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    loadConfigs();
    loadSummaries();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await api.get<AIConfig[]>('/ai-configs');
      setConfigs(response.data);
      const defaultConfig = response.data.find(c => c.is_default);
      if (defaultConfig) {
        setSelectedConfig(defaultConfig.id);
      }
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  const loadSummaries = async () => {
    try {
      const response = await api.get<Summary[]>('/summaries');
      setSummaries(response.data);
    } catch (err) {
      console.error('Failed to load summaries:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        title: title || '未命名总结',
        config_id: selectedConfig || undefined,
      };

      if (inputMode === 'text') {
        payload.text = text;
      } else {
        payload.url = url;
      }

      await api.post('/summaries', payload);
      setText('');
      setUrl('');
      setTitle('');
      loadSummaries();
    } catch (err: any) {
      setError(err.response?.data?.error || '创建总结失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">RIM</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                AI 配置
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">创建总结</h2>

              {error && (
                <div className="mb-4 bg-red-50 text-red-500 p-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标题
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入标题（可选）"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    输入方式
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setInputMode('text')}
                      className={`px-4 py-2 rounded ${
                        inputMode === 'text'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      文本
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('url')}
                      className={`px-4 py-2 rounded ${
                        inputMode === 'url'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {inputMode === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文本内容
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      required
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="粘贴文章内容..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文章 URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/article"
                    />
                  </div>
                )}

                {configs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI 模型
                    </label>
                    <select
                      value={selectedConfig}
                      onChange={(e) => setSelectedConfig(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {configs.map((config) => (
                        <option key={config.id} value={config.id}>
                          {config.provider} - {config.model}
                          {config.is_default && ' (默认)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || configs.length === 0}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '生成中...' : '生成总结'}
                </button>

                {configs.length === 0 && (
                  <p className="text-sm text-red-500 text-center">
                    请先配置 AI 模型
                  </p>
                )}
              </form>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">历史记录</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {summaries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暂无历史记录</p>
                ) : (
                  summaries.map((summary) => (
                    <div
                      key={summary.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/summary/${summary.id}`)}
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {summary.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {summary.summary}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {summary.provider} - {summary.model}
                        </span>
                        <span>
                          {new Date(summary.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfigModal && (
        <ConfigModal
          onClose={() => {
            setShowConfigModal(false);
            loadConfigs();
          }}
        />
      )}
    </div>
  );
};

const ConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4');
  const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modelOptions: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo'],
    claude: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    gemini: ['gemini-pro'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/ai-configs', {
        provider,
        model,
        api_key: apiKey,
        is_default: isDefault,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '配置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">添加 AI 配置</h2>

        {error && (
          <div className="mb-4 bg-red-50 text-red-500 p-3 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提供商
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel(modelOptions[e.target.value][0]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {modelOptions[provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="sk-..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              设为默认
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
