export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AIConfig {
  id: number;
  provider: string;
  provider_type?: string;
  model: string;
  base_url?: string;
  is_default: boolean;
}

export interface Summary {
  id: number;
  title: string;
  source_type: string;
  source_url?: string;
  original_text?: string;
  summary: string;
  key_points: string[];
  provider: string;
  model: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadedFile {
  id: number;
  title: string;
  filename: string;
  file_size: number;
}

// ==================== 音频转写类型 ====================

export interface ASRConfig {
  id: number;
  provider: string;       // xunfei, aliyun, whisper
  app_id?: string;
  base_url?: string;
  region?: string;
  is_default: boolean;
  created_at: string;
}

export interface ASRProvider {
  name: string;
  icon: string;
  description: string;
  fields: string[];
}

export interface AudioFile {
  id: number;
  title: string;
  filename: string;
  file_size: number;
  file_type: string;
  duration?: number;
  created_at: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionTask {
  id: number;
  audio_id: number;
  title: string;
  provider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  segments?: TranscriptionSegment[];
  error?: string;
  created_at: string;
  updated_at: string;
}
