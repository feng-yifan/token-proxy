export interface ModelConfig {
  name: string;
}

export interface ApiService {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  api_type: string;
  models: ModelConfig[];
  default_model: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApiServiceRequest {
  name: string;
  base_url: string;
  api_key: string;
  api_type: string;
  models: ModelConfig[];
  default_model: string;
}

export interface UpdateApiServiceRequest {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  api_type: string;
  models: ModelConfig[];
  default_model: string;
}
