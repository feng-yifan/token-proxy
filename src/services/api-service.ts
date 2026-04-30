import { invoke } from '@tauri-apps/api/core';
import type {
  ApiService,
  CreateApiServiceRequest,
  UpdateApiServiceRequest,
} from '../types';

export async function listServices(): Promise<ApiService[]> {
  try {
    return await invoke<ApiService[]>('list_services');
  } catch (error) {
    console.error('Failed to list services:', error);
    throw error;
  }
}

export async function getService(id: string): Promise<ApiService> {
  try {
    return await invoke<ApiService>('get_service', { id });
  } catch (error) {
    console.error('Failed to get service:', error);
    throw error;
  }
}

export async function createService(
  data: CreateApiServiceRequest,
): Promise<ApiService> {
  try {
    return await invoke<ApiService>('create_service', {
      name: data.name,
      baseUrl: data.base_url,
      apiKey: data.api_key,
      apiType: data.api_type,
      models: data.models,
    });
  } catch (error) {
    console.error('Failed to create service:', error);
    throw error;
  }
}

export async function updateService(
  data: UpdateApiServiceRequest,
): Promise<ApiService> {
  try {
    return await invoke<ApiService>('update_service', {
      id: data.id,
      name: data.name,
      baseUrl: data.base_url,
      apiKey: data.api_key,
      apiType: data.api_type,
      models: data.models,
    });
  } catch (error) {
    console.error('Failed to update service:', error);
    throw error;
  }
}

export async function deleteService(id: string): Promise<void> {
  try {
    await invoke('delete_service', { id });
  } catch (error) {
    console.error('Failed to delete service:', error);
    throw error;
  }
}
