export interface ApiService {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApiServiceRequest {
  name: string;
  base_url: string;
  api_key: string;
}

export interface UpdateApiServiceRequest {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
}
