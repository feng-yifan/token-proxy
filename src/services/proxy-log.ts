import { invoke } from '@tauri-apps/api/core';
import type { ProxyLog, PaginatedLogs } from '../types';

export interface QueryLogsParams {
  page: number;
  page_size: number;
  access_point_id?: string;
}

export async function queryLogs(
  params: QueryLogsParams,
): Promise<PaginatedLogs> {
  try {
    return await invoke<PaginatedLogs>('query_logs', {
      page: params.page,
      pageSize: params.page_size,
      accessPointId: params.access_point_id,
    });
  } catch (error) {
    console.error('Failed to query logs:', error);
    throw error;
  }
}

export async function getLog(id: string): Promise<ProxyLog> {
  try {
    return await invoke<ProxyLog>('get_log', { id });
  } catch (error) {
    console.error('Failed to get log:', error);
    throw error;
  }
}

export async function clearLogs(): Promise<number> {
  try {
    return await invoke<number>('clear_logs');
  } catch (error) {
    console.error('Failed to clear logs:', error);
    throw error;
  }
}
