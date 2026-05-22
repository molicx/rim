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
