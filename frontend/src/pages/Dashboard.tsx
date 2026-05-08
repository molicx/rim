import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AIConfig, Summary } from '@/types';
import ConfigModal from '@/components/ConfigModal';

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
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);
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

  const handleDeleteSummary = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条总结吗？')) return;

    try {
      await api.delete(`/summaries/${id}`);
      loadSummaries();
    } catch (err) {
      alert('删除失败');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">RIM</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowConfigModal(true);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  AI 配置
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出
                </span>
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
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={() => navigate(`/summary/${summary.id}`)}
                    >
                      <button
                        onClick={(e) => handleDeleteSummary(summary.id, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <h3 className="font-semibold text-gray-900 mb-2 pr-8">
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
                          {new Date(summary.created_at).toLocaleDateString()}}
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
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setEditingConfig(null);
            loadConfigs();
          }}
          onConfigAdded={() => {
            loadConfigs();
          }}
          configs={configs}
          editingConfig={editingConfig}
          onEditConfig={(config) => {
            setEditingConfig(config);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
