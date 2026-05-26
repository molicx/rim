import React, { useState } from 'react';
import api from '@/services/api';
import { AudioFile } from '@/types';

interface PodcastLinkInputProps {
  onAudioProcessed?: (audio: AudioFile) => void;
}

const PodcastLinkInput: React.FC<PodcastLinkInputProps> = ({ onAudioProcessed }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('请输入播客链接');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/audio/podcast', { url: url.trim() });
      const data = response.data;

      setSuccess(`音频下载成功：${data.title}`);

      if (onAudioProcessed) {
        onAudioProcessed({
          id: data.audio_id,
          title: data.title,
          filename: data.title,
          file_size: 0,
          file_type: 'podcast',
          created_at: new Date().toISOString(),
        });
      }

      setUrl('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '处理失败';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const urlExamples = [
    { label: 'RSS 订阅', value: 'https://feed.xyzfm.space/xxxxx' },
    { label: '直接音频', value: 'https://example.com/podcast/episode.mp3' },
  ];

  return (
    <div className="space-y-4">
      {/* URL 输入 */}
      <form onSubmit={handleSubmit} className="space-y-3">
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

        {/* 示例链接 */}
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

        {/* 错误/成功提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-sm text-emerald-700">{success}</p>
          </div>
        )}

        {/* 提交按钮 */}
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

      {/* 支持的格式说明 */}
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
