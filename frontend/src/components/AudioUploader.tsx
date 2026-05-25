import React, { useState, useRef, useEffect } from 'react';
import api from '@/services/api';
import { ASRConfig, TranscriptionTask, TranscriptionSegment } from '@/types';

interface AudioUploaderProps {
  asrConfigs: ASRConfig[];
  onTranscriptionComplete?: (task: TranscriptionTask) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ asrConfigs, onTranscriptionComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioId, setAudioId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [task, setTask] = useState<TranscriptionTask | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 获取默认 ASR 配置
  const defaultConfig = asrConfigs.find(c => c.is_default) || asrConfigs[0];

  useEffect(() => {
    if (defaultConfig && !selectedProvider) {
      setSelectedProvider(defaultConfig.provider);
    }
  }, [defaultConfig]);

  // 轮询任务状态
  useEffect(() => {
    if (task && (task.status === 'pending' || task.status === 'processing')) {
      pollingRef.current = setInterval(async () => {
        try {
          const response = await api.get<TranscriptionTask>(`/audio/transcriptions/${task.id}`);
          setTask(response.data);
          if (response.data.status === 'completed' || response.data.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (response.data.status === 'completed' && onTranscriptionComplete) {
              onTranscriptionComplete(response.data);
            }
          }
        } catch (err) {
          console.error('Failed to poll task status:', err);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [task?.id, task?.status]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 验证文件类型
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/mp3'];
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|mp4|wav|m4a|flac|ogg|aac)$/i)) {
      setError('不支持的音频格式，仅支持 mp3、mp4、wav、m4a、flac、ogg、aac');
      return;
    }

    // 验证文件大小 (500MB)
    if (selectedFile.size > 500 * 1024 * 1024) {
      setError('音频文件不能超过 500MB');
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    setError('');
    setAudioId(null);
    setTask(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title);

    try {
      const response = await api.post('/audio/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        },
      });

      setAudioId(response.data.id);
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioId || !selectedProvider) return;

    setTranscribing(true);
    setError('');

    try {
      const response = await api.post('/audio/transcribe', {
        audio_id: audioId,
        title,
        provider: selectedProvider,
      });

      setTask({
        id: parseInt(response.data.task_id),
        audio_id: audioId,
        title,
        provider: selectedProvider,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.response?.data?.error || '提交转写任务失败');
    } finally {
      setTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />等待中</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />处理中</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />已完成</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" />失败</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 文件上传 */}
      {!audioId && (
        <div>
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-violet-400 hover:bg-violet-50/30 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {file ? file.name : '点击或拖拽音频文件到此处'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              支持 mp3、mp4、wav、m4a、flac、ogg、aac，最大 500MB
            </p>
          </div>

          {file && (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all text-sm"
                placeholder="输入标题（可选）"
              />

              {uploading && (
                <div>
                  <div className="bg-slate-200 rounded-full h-2">
                    <div className="bg-violet-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">上传中... {uploadProgress}%</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {uploading ? '上传中...' : '上传音频'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 上传成功 - 选择 ASR 提供商 */}
      {audioId && !task && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">音频上传成功</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">选择语音识别服务</label>
            <div className="grid grid-cols-3 gap-2">
              {asrConfigs.map((config) => (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => setSelectedProvider(config.provider)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedProvider === config.provider
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">
                    {config.provider === 'xunfei' ? '🦊' : config.provider === 'aliyun' ? '☁️' : '🤖'}
                  </span>
                  <p className="text-xs font-medium text-slate-700 mt-1">
                    {config.provider === 'xunfei' ? '讯飞' : config.provider === 'aliyun' ? '阿里云' : 'Whisper'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleTranscribe}
            disabled={transcribing || !selectedProvider}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {transcribing ? '提交中...' : '开始转写'}
          </button>
        </div>
      )}

      {/* 转写任务状态 */}
      {task && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-900">转写任务</h3>
              {getStatusBadge(task.status)}
            </div>

            {task.status === 'processing' && (
              <div className="mb-3">
                <div className="bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">正在转写中，请稍候...</p>
              </div>
            )}

            {task.status === 'completed' && task.result && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.result}</p>
                </div>

                {task.segments && task.segments.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      查看时间轴 ({task.segments.length} 段)
                    </summary>
                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                      {task.segments.map((segment: TranscriptionSegment, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                          <span className="flex-shrink-0 px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-mono">
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </span>
                          <span className="text-sm text-slate-700">{segment.text}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {task.status === 'failed' && task.error && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{task.error}</p>
              </div>
            )}
          </div>

          {(task.status === 'completed' || task.status === 'failed') && (
            <button
              onClick={() => {
                setFile(null);
                setTitle('');
                setAudioId(null);
                setTask(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              上传新音频
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
