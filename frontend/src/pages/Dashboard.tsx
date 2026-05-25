import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AIConfig, ASRConfig, Summary } from '@/types';
import ConfigModal from '@/components/ConfigModal';
import ASRConfigModal from '@/components/ASRConfigModal';
import AudioUploader from '@/components/AudioUploader';

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
  const [showASRConfigModal, setShowASRConfigModal] = useState(false);
  const [editingASRConfig, setEditingASRConfig] = useState<ASRConfig | null>(null);
  const [asrConfigs, setAsrConfigs] = useState<ASRConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'audio'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    loadConfigs();
    loadSummaries();
    loadASRConfigs();
  }, []);

  const loadASRConfigs = async () => {
    try {
      const response = await api.get<ASRConfig[]>('/asr-configs');
      setAsrConfigs(response.data);
    } catch (err) {
      console.error('Failed to load ASR configs:', err);
    }
  };

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

    const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setError('不支持的文件类型，仅支持 PDF、Word、TXT、Markdown');
      return;
    }

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

  const getProviderIcon = (provider: string) => {
    const p = provider?.toLowerCase() || '';
    if (p.includes('openai') || p.includes('gpt')) return '🟢';
    if (p.includes('claude')) return '🔵';
    if (p.includes('gemini')) return '🟡';
    if (p.includes('deepseek')) return '🟣';
    if (p.includes('qwen') || p.includes('通义')) return '🟠';
    return '⚪';
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'file':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            文件
          </span>
        );
      case 'url':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            网页
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            文本
          </span>
        );
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">RIM</h1>
                <p className="text-[10px] text-slate-400 -mt-0.5">智能总结助手</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowConfigModal(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setEditingASRConfig(null);
                  setShowASRConfigModal(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                title="语音识别配置"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 功能切换 Tab */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 w-fit shadow-sm border border-slate-200/60">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'text'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            文章总结
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'audio'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            音频转写
            {asrConfigs.length === 0 && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">需配置</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* 左侧 - 内容区 */}
          <div className="lg:col-span-3">
            {activeTab === 'audio' ? (
              /* 音频上传区域 */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </span>
                    音频转写
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">上传音频文件，自动转写为文字并生成总结</p>
                </div>
                <div className="p-6">
                  {asrConfigs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mb-2">请先配置语音识别服务</p>
                      <p className="text-xs text-slate-500 mb-4">支持讯飞、阿里云、OpenAI Whisper 等多种服务</p>
                      <button
                        onClick={() => setShowASRConfigModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        配置语音识别
                      </button>
                    </div>
                  ) : (
                    <AudioUploader asrConfigs={asrConfigs} />
                  )}
                </div>
              </div>
            ) : (
              /* 文章总结区域 */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              {/* 卡片标题 */}
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  创建总结
                </h2>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 标题 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">标题</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-sm"
                      placeholder="输入标题（可选）"
                    />
                  </div>

                  {/* 输入方式 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">输入方式</label>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      {[
                        { value: 'text', label: '文本', icon: '📝' },
                        { value: 'url', label: '网页', icon: '🔗' },
                        { value: 'file', label: '文件', icon: '📁' },
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setInputMode(mode.value as any)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            inputMode === mode.value
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <span>{mode.icon}</span>
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 输入区域 */}
                  {inputMode === 'text' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">文本内容</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-sm resize-none"
                        placeholder="粘贴文章内容..."
                      />
                    </div>
                  ) : inputMode === 'url' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">文章 URL</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-sm"
                          placeholder="https://example.com/article"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">上传文件</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt,.md"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            {uploadedFileName || '点击或拖拽文件到此处'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            支持 PDF、Word、TXT、Markdown，最大 10MB
                          </p>
                        </label>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="mt-4 max-w-xs mx-auto">
                            <div className="bg-slate-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">上传中... {uploadProgress}%</p>
                          </div>
                        )}
                        {uploadedFileId && (
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            文件上传成功
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI 模型选择 */}
                  {configs.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">AI 模型</label>
                      <div className="relative">
                        <select
                          value={selectedConfig}
                          onChange={(e) => setSelectedConfig(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-sm appearance-none cursor-pointer"
                        >
                          {configs.map((config) => (
                            <option key={config.id} value={config.id}>
                              {getProviderIcon(config.provider)} {config.provider} - {config.model}
                              {config.is_default && ' (默认)'}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 总结定制 */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                    <label className="block text-sm font-medium text-slate-700">总结定制</label>

                    <div>
                      <label className="block text-xs text-slate-500 mb-2">长度</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'brief', label: '极简', desc: '50字' },
                          { value: 'standard', label: '标准', desc: '200字' },
                          { value: 'detailed', label: '详细', desc: '500字' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSummaryLength(opt.value as any)}
                            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
                              summaryLength === opt.value
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <div className="text-sm font-medium">{opt.label}</div>
                            <div className={`text-[10px] ${summaryLength === opt.value ? 'text-blue-200' : 'text-slate-400'}`}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 mb-2">风格</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'points', label: '要点式', icon: '📋' },
                          { value: 'paragraph', label: '段落式', icon: '📝' },
                          { value: 'qa', label: '问答式', icon: '❓' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSummaryStyle(opt.value as any)}
                            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
                              summaryStyle === opt.value
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <div className="text-sm">{opt.icon}</div>
                            <div className={`text-xs font-medium ${summaryStyle === opt.value ? 'text-blue-100' : ''}`}>{opt.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 提交按钮 */}
                  {inputMode === 'file' ? (
                    <button
                      type="button"
                      onClick={handleFileSummarize}
                      disabled={loading || !uploadedFileId || configs.length === 0}
                      className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          解析并生成总结中...
                        </span>
                      ) : (
                        '解析文件并生成总结'
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || configs.length === 0}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          生成中...
                        </span>
                      ) : (
                        '生成总结'
                      )}
                    </button>
                  )}

                  {configs.length === 0 && (
                    <p className="text-sm text-amber-600 text-center bg-amber-50 py-2 rounded-lg">
                      ⚠️ 请先配置 AI 模型
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* 右侧 - 历史记录 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  历史记录
                  {summaries.length > 0 && (
                    <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {summaries.length}
                    </span>
                  )}
                </h2>
              </div>

              <div className="p-4">
                {summaries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">暂无历史记录</p>
                    <p className="text-xs text-slate-400 mt-1">创建你的第一个总结吧</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {summaries.map((summary) => (
                      <div
                        key={summary.id}
                        className="group p-4 bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate(`/summary/${summary.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-medium text-slate-900 text-sm line-clamp-1 flex-1">
                            {summary.title}
                          </h3>
                          <button
                            onClick={(e) => handleDeleteSummary(summary.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                          {summary.summary}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(summary.source_type)}
                            <span className="text-xs text-slate-400">
                              {getProviderIcon(summary.provider)} {summary.provider}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatTime(summary.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI 配置弹窗 */}
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

      {/* ASR 配置弹窗 */}
      {showASRConfigModal && (
        <ASRConfigModal
          isOpen={showASRConfigModal}
          onClose={() => {
            setShowASRConfigModal(false);
            setEditingASRConfig(null);
            loadASRConfigs();
          }}
          onConfigAdded={() => {
            loadASRConfigs();
          }}
          configs={asrConfigs}
          editingConfig={editingASRConfig}
          onEditConfig={(config) => {
            setEditingASRConfig(config);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
