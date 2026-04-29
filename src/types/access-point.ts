export type HeaderAction = 'set' | 'override' | 'remove';

export interface HeaderRule {
  header_name: string;
  header_value: string;
  action: HeaderAction;
}

export interface AccessPoint {
  id: string;
  path: string;
  service_id: string;
  header_rules: HeaderRule[];
  log_full_content: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccessPointRequest {
  path: string;
  service_id: string;
  header_rules: HeaderRule[];
  log_full_content: boolean;
}

export interface UpdateAccessPointRequest {
  id: string;
  path: string;
  service_id: string;
  header_rules: HeaderRule[];
  log_full_content: boolean;
}
