import { invoke } from '@tauri-apps/api/core';
import type {
  AccessPoint,
  AccessPointService,
  CreateAccessPointRequest,
  UpdateAccessPointRequest,
} from '../types';

export async function listAccessPoints(): Promise<AccessPoint[]> {
  try {
    return await invoke<AccessPoint[]>('list_access_points');
  } catch (error) {
    console.error('Failed to list access points:', error);
    throw error;
  }
}

export async function getAccessPoint(id: string): Promise<AccessPoint> {
  try {
    return await invoke<AccessPoint>('get_access_point', { id });
  } catch (error) {
    console.error('Failed to get access point:', error);
    throw error;
  }
}

export async function createAccessPoint(
  data: CreateAccessPointRequest,
): Promise<AccessPoint> {
  try {
    return await invoke<AccessPoint>('create_access_point', {
      path: data.path,
      services: data.services,
      apiKey: data.api_key,
      logFullContent: data.log_full_content,
    });
  } catch (error) {
    console.error('Failed to create access point:', error);
    throw error;
  }
}

export async function updateAccessPoint(
  data: UpdateAccessPointRequest,
): Promise<AccessPoint> {
  try {
    return await invoke<AccessPoint>('update_access_point', {
      id: data.id,
      path: data.path,
      services: data.services,
      apiKey: data.api_key,
      logFullContent: data.log_full_content,
    });
  } catch (error) {
    console.error('Failed to update access point:', error);
    throw error;
  }
}

export async function deleteAccessPoint(id: string): Promise<void> {
  try {
    await invoke('delete_access_point', { id });
  } catch (error) {
    console.error('Failed to delete access point:', error);
    throw error;
  }
}

export async function switchAccessPointService(
  id: string,
  serviceId: string,
): Promise<AccessPoint> {
  try {
    return await invoke<AccessPoint>('switch_access_point_service', {
      id,
      serviceId,
    });
  } catch (error) {
    console.error('Failed to switch access point service:', error);
    throw error;
  }
}

export async function updateAccessPointServices(
  id: string,
  services: AccessPointService[],
): Promise<AccessPoint> {
  try {
    return await invoke<AccessPoint>('update_access_point_services', {
      id,
      services,
    });
  } catch (error) {
    console.error('Failed to update access point services:', error);
    throw error;
  }
}

export async function toggleAccessPoint(id: string): Promise<AccessPoint> {
  try {
    return await invoke<AccessPoint>('toggle_access_point', { id });
  } catch (error) {
    console.error('Failed to toggle access point:', error);
    throw error;
  }
}
