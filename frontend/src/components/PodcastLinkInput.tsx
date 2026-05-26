import React, { useState } from 'react';
import api from '@/services/api';
import { ASRConfig, AudioFile, TranscriptionTask } from '@/types';

interface PodcastLinkInputProps {
  asrConfigs: ASRConfig[];
  onTranscriptionComplete?: (task: TranscriptionTask) => void;
}

const PodcastLinkInput: React.FC<PodcastLinkInputProps> = ({ asrConfigs, onTranscriptionComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setSuccess] = useState('');
  const [downloadedAudio, setDownloadedAudio] = useState<AudioFile | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [task, setTask] = useState<TranscriptionTask | null>(null);

  // 获取默认 ASR 配置
  const defaultConfig = asrConfigs.find(c => c.is_default) || asrConfigs[0];

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('请输入播客链接');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setDownloadedAudio(null);
    setTask(null);

    try {
      const response = await api.post('/audio/podcast', { url: url.trim() });
      const data = response.data;

      const audio: AudioFile = {
        id: data.audio_id,
        title: data.title,
        filename: data.title,
        file_size: data.size || 0,
        file_type: 'podcast',
        created_at: new Date().toISOString(),
      };

      setDownloadedAudio(audio);
      setSuccess(`音频下载成功：${data.title}`);
      setUrl('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '处理失败';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!downloadedAudio) return;

    const provider = selectedProvider || defaultConfig?.provider;
    if (!provider) {
      setError('请先配置语音识别服务');
      return;
    }

    setTranscribing(true);
    setError('');

    try {
      const response = await api.post('/audio/transcribe', {
        audio_id: downloadedAudio.id,
        title: downloadedAudio.title,
        provider: provider,
      });

      const taskData = response.data;
      setTask({
        id: parseInt(taskData.task_id),
        audio_id: downloadedAudio.id,
        title: downloadedAudio.title,
        provider: provider,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (onTranscriptionComplete) {
        onTranscriptionComplete(taskData);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '提交转写任务失败';
      setError(errorMsg);
    } finally {
      setTranscribing(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setError('');
    setSuccess('');
    setDownloadedAudio(null);
    setTask(null);
  };

  const urlExamples = [
    { label: 'RSS 订阅', value: 'https://feed.xyzfm.space/xxxxx' },
    { label: '直接音频', value: 'https://example.com/podcast/episode.mp3' },
  ];

  // 转写中或已完成
  if (task) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">转写任务已提交</span>
          </div>
          <p className="text-sm text-emerald-600">标题：{task.title}</p>
          <p className="text-sm text-emerald-600">服务商：{task.provider}</p>
          <p className="text-xs text-emerald-500 mt-2">转写完成后将自动生成总结</p>
        </div>
        <button
          onClick={handleReset}
          className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          处理新链接
        </button>
      </div>
    );
  }

  // 音频下载成功，显示转写选项
  if (downloadedAudio) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">音频下载成功</span>
          </div>
          <p className="text-sm text-emerald-600">标题：{downloadedAudio.title}</p>
        </div>

        {/* ASR 提供商选择 */}
        {asrConfigs.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">选择语音识别服务</label>
            <div className="grid grid-cols-3 gap-2">
              {asrConfigs.map((config) => (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => setSelectedProvider(config.provider)}
                  className={`p-2 rounded-xl border-2 text-center transition-all ${
                    (selectedProvider || defaultConfig?.provider) === config.provider
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
        )}

        {/* 转写按钮 */}
        <button
          onClick={handleTranscribe}
          disabled={transcribing}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
        >
          {transcribing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              提交中...
            </span>
          ) : (
            '开始转写'
          )}
        </button>

        <button
          onClick={handleReset}
          className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          处理新链接
        </button>
      </div>
    );
  }

  // 初始状态：URL 输入
  return (
    <div className="space-y-4">
      <form onSubmit={handleDownload} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            播客链接
          </label>
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all text-sm"
              placeholder="输入播客链接（RSS 订阅链接或音频直链）"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">示例：</span>
          {urlExamples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setUrl(example.value)}
              className="text-xs text-violet-600 hover:text-violet-800 hover:underline"
            >
              {example.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              处理中...
            </span>
          ) : (
            '解析并下载音频'
          )}
        </button>
      </form>

      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500">
          <strong>支持格式：</strong>
          RSS 订阅链接、音频文件直链（mp3、mp4、wav、m4a、flac、ogg、aac）
        </p>
      </div>
    </div>
  );
};

export default PodcastLinkInput;
