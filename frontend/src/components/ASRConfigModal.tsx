import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { ASRConfig, ASRProvider } from '@/types';

interface ASRConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigAdded: () => void;
  configs: ASRConfig[];
  editingConfig?: ASRConfig | null;
  onEditConfig?: (config: ASRConfig) => void;
}

const ASRConfigModal: React.FC<ASRConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigAdded,
  configs,
  editingConfig,
  onEditConfig,
}) => {
  const [provider, setProvider] = useState('xunfei');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [appId, setAppId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [accessKeySecret, setAccessKeySecret] = useState('');
  const [appKey, setAppKey] = useState('');
  const [region, setRegion] = useState('cn-shanghai');
  const [baseUrl, setBaseUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [providers, setProviders] = useState<Record<string, ASRProvider>>({});

  const isEditMode = !!editingConfig;

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (editingConfig) {
      setProvider(editingConfig.provider);
      setAppId(editingConfig.app_id || '');
      setBaseUrl(editingConfig.base_url || '');
      setRegion(editingConfig.region || 'cn-shanghai');
      setIsDefault(editingConfig.is_default);
      setApiKey('');
      setApiSecret('');
      setAccessKeyId('');
      setAccessKeySecret('');
      setAppKey('');
    } else {
      setProvider('xunfei');
      setApiKey('');
      setApiSecret('');
      setAppId('');
      setAccessKeyId('');
      setAccessKeySecret('');
      setAppKey('');
      setRegion('cn-shanghai');
      setBaseUrl('');
      setIsDefault(false);
    }
    setError('');
    setShowApiKey(false);
  }, [editingConfig, isOpen]);

  const loadProviders = async () => {
    try {
      const response = await api.get('/asr/providers');
      setProviders(response.data.info || {});
    } catch (err) {
      console.error('Failed to load ASR providers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        provider,
        is_default: isDefault,
      };

      // 根据提供商添加必要字段
      switch (provider) {
        case 'xunfei':
          if (!isEditMode && !apiKey) {
            setError('请输入 API Key');
            setLoading(false);
            return;
          }
          if (apiKey) payload.api_key = apiKey;
          if (apiSecret) payload.api_secret = apiSecret;
          if (appId) payload.app_id = appId;
          break;
        case 'aliyun':
          if (!isEditMode && !apiKey) {
            setError('请输入 Access Key ID');
            setLoading(false);
            return;
          }
          if (apiKey) payload.access_key_id = apiKey;
          if (apiSecret) payload.access_key_secret = apiSecret;
          if (appId) payload.app_key = appId;
          if (region) payload.region = region;
          break;
        case 'whisper':
          if (!isEditMode && !apiKey) {
            setError('请输入 API Key');
            setLoading(false);
            return;
          }
          if (apiKey) payload.api_key = apiKey;
          if (baseUrl) payload.base_url = baseUrl;
          break;
      }

      if (baseUrl && provider !== 'whisper') {
        payload.base_url = baseUrl;
      }

      if (isEditMode && editingConfig) {
        await api.put(`/asr-configs/${editingConfig.id}`, payload);
      } else {
        await api.post('/asr-configs', payload);
      }

      onConfigAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || (isEditMode ? '更新失败' : '添加失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此配置吗？')) return;
    try {
      await api.delete(`/asr-configs/${id}`);
      onConfigAdded();
    } catch (err) {
      alert('删除失败');
    }
  };

  const getProviderIcon = (providerName: string) => {
    const info = providers[providerName];
    return info?.icon || '🎙️';
  };

  const getProviderName = (providerName: string) => {
    const info = providers[providerName];
    return info?.name || providerName;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">语音识别配置</h2>
              <p className="text-xs text-slate-500">配置 ASR 服务以使用音频转写功能</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 已有配置 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">已有配置 ({configs.length})</h3>
            {configs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-500">暂无配置</p>
              </div>
            ) : (
              <div className="space-y-2">
                {configs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getProviderIcon(config.provider)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-sm">{getProviderName(config.provider)}</span>
                          {config.is_default && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">默认</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEditConfig?.(config)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(config.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 添加/编辑表单 */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-medium text-slate-700 mb-4">{isEditMode ? '编辑配置' : '添加新配置'}</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 提供商选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ASR 提供商</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(providers).map(([key, info]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProvider(key)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        provider === key
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{info.icon}</span>
                      <p className="text-xs font-medium text-slate-700 mt-1">{info.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 讯飞配置 */}
              {provider === 'xunfei' && (
                <>
                  <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                    <p className="text-xs text-violet-700">
                      <strong>讯飞开放平台</strong>：中文识别准确率最高，支持多种方言。每天 500 次免费调用。
                    </p>
                    <p className="text-xs text-violet-600 mt-1">注册地址：https://www.xfyun.cn</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 API Key" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Secret</label>
                    <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 API Secret" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">App ID</label>
                    <input type="text" value={appId} onChange={(e) => setAppId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 App ID" />
                  </div>
                </>
              )}

              {/* 阿里云配置 */}
              {provider === 'aliyun' && (
                <>
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    <p className="text-xs text-orange-700">
                      <strong>阿里云智能语音</strong>：稳定可靠，支持实时识别。每月 1800 分钟免费。
                    </p>
                    <p className="text-xs text-orange-600 mt-1">注册地址：https://nls-portal.console.aliyun.com</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Access Key ID</label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 Access Key ID" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Access Key Secret</label>
                    <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 Access Key Secret" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">App Key</label>
                    <input type="text" value={appId} onChange={(e) => setAppId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 App Key" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">区域</label>
                    <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-all text-sm">
                      <option value="cn-shanghai">上海 (cn-shanghai)</option>
                      <option value="cn-beijing">北京 (cn-beijing)</option>
                      <option value="cn-shenzhen">深圳 (cn-shenzhen)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Whisper 配置 */}
              {provider === 'whisper' && (
                <>
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                    <p className="text-xs text-green-700">
                      <strong>OpenAI Whisper</strong>：支持云端 API 和本地模型。云端按分钟计费。
                    </p>
                    <p className="text-xs text-green-600 mt-1">注册地址：https://platform.openai.com</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
                    <div className="relative">
                      <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="输入 OpenAI API Key" />
                      <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showApiKey ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Base URL (可选)</label>
                    <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-all text-sm" placeholder="https://api.openai.com/v1" />
                    <p className="text-xs text-slate-400 mt-1">可使用第三方代理服务</p>
                  </div>
                </>
              )}

              {/* 设为默认 */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input type="checkbox" id="isDefaultASR" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 cursor-pointer" />
                <label htmlFor="isDefaultASR" className="text-sm text-slate-700 cursor-pointer">设为默认配置</label>
              </div>

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
              >
                {loading ? (isEditMode ? '更新中...' : '添加中...') : (isEditMode ? '更新配置' : '添加配置')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ASRConfigModal;
