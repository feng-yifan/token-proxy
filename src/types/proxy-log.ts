export interface ProxyLog {
  id: string;
  access_point_id: string;
  request_path: string;
  method: string;
  status_code: number;
  latency_ms: number;
  request_timestamp: string;
  request_body: string | null;
  response_body: string | null;
  created_at: string;
}

export interface PaginatedLogs {
  logs: ProxyLog[];
  total: number;
  page: number;
  page_size: number;
}
