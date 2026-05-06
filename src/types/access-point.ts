export interface ModelMapping {
  source: string;
  target: string;
}

export interface AccessPointService {
  service_id: string;
  model_mappings: ModelMapping[];
}

export interface AccessPoint {
  id: string;
  path: string;
  services: AccessPointService[];
  api_key: string;
  log_full_content: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccessPointRequest {
  path: string;
  services: AccessPointService[];
  api_key: string;
  log_full_content: boolean;
}

export interface UpdateAccessPointRequest {
  id: string;
  path: string;
  services: AccessPointService[];
  api_key: string;
  log_full_content: boolean;
}
