import React, { useState, useEffect, useRef } from 'react';
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
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'file'>('text');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileId, setUploadedFileId] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [summaryLength, setSummaryLength] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [summaryStyle, setSummaryStyle] = useState<'points' | 'paragraph' | 'qa'>('points');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setError('不支持的文件类型，仅支持 PDF、Word、TXT、Markdown');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setError('');
    setUploadProgress(0);
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));

    try {
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        },
      });
      setUploadedFileId(response.data.id);
      setUploadProgress(100);
    } catch (err: any) {
      setError(err.response?.data?.error || '文件上传失败');
      setUploadProgress(0);
      setUploadedFileName('');
    }
  };

  const handleFileSummarize = async () => {
    if (!uploadedFileId) {
      setError('请先上传文件');
      return;
    }
    if (configs.length === 0) {
      setError('请先配置 AI 模型');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/files/summarize', {
        file_id: uploadedFileId,
        title: title || uploadedFileName,
        config_id: selectedConfig || undefined,
      });
      setUploadedFileId(null);
      setUploadedFileName('');
      setUploadProgress(0);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadSummaries();
    } catch (err: any) {
      setError(err.response?.data?.error || '文件总结失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        title: title || '未命名总结',
        config_id: selectedConfig || undefined,
        length: summaryLength,
        style: summaryStyle,
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
                  <div className="flex space-x-2">
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
                    <button
                      type="button"
                      onClick={() => setInputMode('file')}
                      className={`px-4 py-2 rounded ${
                        inputMode === 'file'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      文件
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
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="粘贴文章内容..."
                    />
                  </div>
                ) : inputMode === 'url' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文章 URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/article"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      上传文件
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          {uploadedFileName || '点击选择文件或拖拽到此处'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          支持 PDF、Word、TXT、Markdown，最大 10MB
                        </p>
                      </label>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-4">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">上传中... {uploadProgress}%</p>
                        </div>
                      )}
                      {uploadedFileId && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm">文件上传成功</span>
                        </div>
                      )}
                    </div>
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

                {inputMode === 'file' ? (
                  <button
                    type="button"
                    onClick={handleFileSummarize}
                    disabled={loading || !uploadedFileId || configs.length === 0}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? '解析并生成总结中...' : '解析文件并生成总结'}
                  </button>
                ) : (
                <div className="border-t pt-4 space-y-3">
                  <label className="block text-sm font-medium text-gray-700">总结定制</label>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">长度</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'brief', label: '极简' },
                        { value: 'standard', label: '标准' },
                        { value: 'detailed', label: '详细' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSummaryLength(opt.value as any)}
                          className={`flex-1 py-1.5 text-xs rounded ${
                            summaryLength === opt.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">风格</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'points', label: '要点式' },
                        { value: 'paragraph', label: '段落式' },
                        { value: 'qa', label: '问答式' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSummaryStyle(opt.value as any)}
                          className={`flex-1 py-1.5 text-xs rounded ${
                            summaryStyle === opt.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {inputMode === 'file' ? (
                  <button
                    type="button"
                    onClick={handleFileSummarize}
                    disabled={loading || !uploadedFileId || configs.length === 0}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? '解析并生成总结中...' : '解析文件并生成总结'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || configs.length === 0}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? '生成中...' : '生成总结'}
                  </button>
                )}

                {configs.length === 0 && (
                  <p className="text-sm text-red-500 text-center">
                    请先配置 AI 模型
                  </p>
                )}

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
                        <span className="flex items-center gap-2">
                          {summary.source_type === 'file' && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">文件</span>
                          )}
                          {summary.source_type === 'url' && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">URL</span>
                          )}
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
