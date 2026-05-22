import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Summary } from '@/types';

const SummaryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSummary();
  }, [id]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get<Summary>(`/summaries/${id}`);
      setSummary(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载总结失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条总结吗？')) return;

    try {
      await api.delete(`/summaries/${id}`);
      navigate('/');
    } catch (err) {
      alert('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '总结不存在'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center text-red-600 hover:text-red-700"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{summary.title}</h1>
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span>{summary.provider} - {summary.model}</span>
              <span>•</span>
              <span>{new Date(summary.created_at).toLocaleString()}</span>
            </div>
          </div>

          {summary.source_type === 'file' && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">来源</h2>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">文件上传</span>
            </div>
          )}

          {summary.url && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">原文链接</h2>
              <a
                href={summary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {summary.url}
              </a>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">总结内容</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {summary.summary}
              </p>
            </div>
          </div>

          {summary.key_points && summary.key_points.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">关键要点</h2>
              <ul className="space-y-2">
                {summary.key_points.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.original_text && (
            <div className="border-t pt-6">
              <details className="group">
                <summary className="cursor-pointer text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  原文内容
                  <svg
                    className="w-5 h-5 ml-2 transform group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                    {summary.original_text}
                  </p>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryDetail;
