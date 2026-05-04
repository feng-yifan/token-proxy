import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, ProxyStatus } from '../types';

export async function getConfig(): Promise<AppConfig> {
  try {
    return await invoke<AppConfig>('get_config');
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}

export async function updateProxyPort(port: number): Promise<void> {
  try {
    await invoke('update_proxy_port', { port });
  } catch (error) {
    console.error('Failed to update proxy port:', error);
    throw error;
  }
}

export async function updateLogSettings(
  maxLogEntries: number,
  retentionDays: number,
): Promise<void> {
  try {
    await invoke('update_log_settings', {
      maxLogEntries,
      retentionDays,
    });
  } catch (error) {
    console.error('Failed to update log settings:', error);
    throw error;
  }
}

export async function updateAppTheme(theme: string): Promise<void> {
  try {
    await invoke('update_app_theme', { theme });
  } catch (error) {
    console.error('Failed to update app theme:', error);
    throw error;
  }
}

export async function updateStartMinimized(minimized: boolean): Promise<void> {
  try {
    await invoke('update_start_minimized', { minimized });
  } catch (error) {
    console.error('Failed to update start minimized:', error);
    throw error;
  }
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  try {
    return await invoke<ProxyStatus>('get_proxy_status');
  } catch (error) {
    console.error('Failed to get proxy status:', error);
    throw error;
  }
}

export async function restartProxy(): Promise<void> {
  try {
    await invoke('restart_proxy');
  } catch (error) {
    console.error('Failed to restart proxy:', error);
    throw error;
  }
}
