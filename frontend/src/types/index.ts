export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AIConfig {
  id: number;
  provider: string;
  model: string;
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
