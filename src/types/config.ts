import type { ApiService } from './api-service';
import type { AccessPoint } from './access-point';

export interface LogSettings {
  max_log_entries: number;
  retention_days: number;
}

export interface AppConfig {
  proxy_port: number;
  app_theme: string;
  services: ApiService[];
  access_points: AccessPoint[];
  log_settings: LogSettings;
}

export interface ProxyStatus {
  running: boolean;
  port: number;
}
