import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { TranscriptionTask, TranscriptionSegment } from '@/types';
import AudioPlayer from '@/components/AudioPlayer';

const TranscriptionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TranscriptionTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await api.get<TranscriptionTask>(`/audio/transcriptions/${id}`);
      setTask(response.data);

      // 如果有音频文件，获取音频 URL
      if (response.data.audio_id) {
        // 这里假设可以通过 audio_id 获取音频文件
        // 实际可能需要调用另一个 API
        setAudioUrl(`/api/v1/audio/${response.data.audio_id}/file`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '加载转写任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个转写任务吗？')) return;
    try {
      await api.delete(`/audio/transcriptions/${id}`);
      navigate('/');
    } catch (err) {
      alert('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">等待中</span>;
      case 'processing':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">转写中</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">已完成</span>;
      case 'failed':
        return <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium">失败</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium mb-2">{error || '转写任务不存在'}</p>
          <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const segments: TranscriptionSegment[] = task.segments || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </button>
          <div className="flex items-center gap-2">
            {getStatusBadge(task.status)}
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* 标题区域 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-slate-500">🎙️ 音频转写</span>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-500">{task.provider}</span>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-500">{new Date(task.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
        </div>

        {/* 音频播放器 */}
        {task.status === 'completed' && (
          <div className="mb-6">
            <AudioPlayer
              audioUrl={audioUrl}
              segments={segments}
            />
          </div>
        )}

        {/* 转写状态 */}
        {(task.status === 'pending' || task.status === 'processing') && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium">
                {task.status === 'pending' ? '等待转写...' : '正在转写中...'}
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">转写完成后将自动生成总结</p>
          </div>
        )}

        {/* 失败信息 */}
        {task.status === 'failed' && task.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">{task.error}</p>
          </div>
        )}

        {/* 转写结果 */}
        {task.status === 'completed' && task.result && (
          <div className="space-y-6">
            {/* 完整转写文本 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                转写文本
              </h2>
              <div className="prose max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{task.result}</p>
              </div>
            </div>

            {/* 时间轴摘要 */}
            {segments.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  时间轴摘要
                </h2>
                <div className="space-y-3">
                  {segments.map((segment, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <span className="flex-shrink-0 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                        {formatTime(segment.start)}
                      </span>
                      <p className="text-sm text-slate-700">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 生成总结按钮 */}
            <button
              onClick={async () => {
                setSummarizing(true);
                setError('');
                try {
                  const response = await api.post(`/audio/transcriptions/${task.id}/summarize`);
                  navigate(`/summary/${response.data.id}`);
                } catch (err: any) {
                  setError(err.response?.data?.error || err.message || '生成总结失败');
                } finally {
                setSummarizing(false);
                }
              }}
              disabled={summarizing}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {summarizing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成总结中...
                </span>
              ) : (
                '生成总结'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default TranscriptionDetail;
