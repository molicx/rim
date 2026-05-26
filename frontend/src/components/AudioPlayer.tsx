import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TranscriptionSegment } from '@/types';

interface AudioPlayerProps {
  audioUrl?: string;
  segments: TranscriptionSegment[];
  onTimeUpdate?: (time: number) => void;
  highlightSegmentIndex?: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  segments,
  onTimeUpdate,
  highlightSegmentIndex,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // 跳转到指定时间
  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  // 点击时间轴片段跳转
  const handleSegmentClick = useCallback((segment: TranscriptionSegment) => {
    seekTo(segment.start);
    if (!isPlaying) {
      togglePlay();
    }
  }, [seekTo, isPlaying, togglePlay]);

  // 快进/快退
  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seekTo(newTime);
  }, [currentTime, duration, seekTo]);

  // 播放速度
  const changePlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  // 音量
  const changeVolume = useCallback((vol: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = vol;
    setVolume(vol);
  }, []);

  // 音频事件监听
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) onTimeUpdate(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  // 计算进度百分比
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 当前所在的片段
  const currentSegmentIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 音频元素 */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      {/* 播放控制区 */}
      <div className="p-4 border-b border-slate-100">
        {/* 进度条 */}
        <div className="mb-4">
          <div
            className="relative h-2 bg-slate-200 rounded-full cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              seekTo(percent * duration);
            }}
          >
            {/* 进度填充 */}
            <div
              className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            {/* 片段标记 */}
            {segments.map((seg, idx) => {
              const left = duration > 0 ? (seg.start / duration) * 100 : 0;
              const width = duration > 0 ? ((seg.end - seg.start) / duration) * 100 : 0;
              return (
                <div
                  key={idx}
                  className={`absolute h-full rounded-full transition-all ${
                    idx === currentSegmentIndex
                      ? 'bg-amber-400/50'
                      : idx === highlightSegmentIndex
                      ? 'bg-blue-300/50'
                      : 'bg-slate-300/30 hover:bg-blue-200/40'
                  }`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSegmentClick(seg);
                  }}
                />
              );
            })}
            {/* 进度点 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />
          </div>
          {/* 时间显示 */}
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center gap-3">
          {/* 快退 10s */}
          <button
            onClick={() => skip(-10)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="快退 10 秒"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* 播放/暂停 */}
          <button
            onClick={togglePlay}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* 快进 10s */}
          <button
            onClick={() => skip(10)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="快进 10 秒"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>

          {/* 播放速度 */}
          <div className="relative group">
            <button className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              {playbackRate}x
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 px-1">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`block w-full px-3 py-1 text-xs text-left rounded transition-colors ${
                      playbackRate === rate
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 音量 */}
          <div className="relative group">
            <button
              onClick={() => changeVolume(volume === 0 ? 1 : 0)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {volume === 0 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-32">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-center text-slate-500 mt-1">{Math.round(volume * 100)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 时间轴片段列表 */}
      {segments.length > 0 && (
        <div className="p-4 max-h-60 overflow-y-auto">
          <h4 className="text-sm font-medium text-slate-700 mb-3">时间轴</h4>
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div
                key={index}
                onClick={() => handleSegmentClick(segment)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  index === currentSegmentIndex
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    index === currentSegmentIndex
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </span>
                  {index === currentSegmentIndex && (
                    <span className="text-xs text-blue-600 font-medium">播放中</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
