/** Consume los módulos empresariales con Axios, token y diagnóstico existentes. */
import { Injectable } from '@angular/core';
import axios from 'axios';
import { ApiConfigService } from './api_config.service';
import { ApiDebugService } from './api-debug.service';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  constructor(private config: ApiConfigService, private debug: ApiDebugService) {}

  async request(method: 'GET' | 'POST' | 'PUT' | 'PATCH', endpoint: string, data?: unknown): Promise<any> {
    const token = sessionStorage.getItem('auth_token');
    const url = this.config.getApiUrl(endpoint);
    this.debug.begin(method, url, data);
    try {
      const response = await axios.request({ method, url, data, timeout: 10000,
        headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (response.data?.success !== true) throw Object.assign(new Error('La API no confirmó la operación.'), { response });
      this.debug.success(response.status, response.data);
      return response.data.data;
    } catch (error) {
      this.debug.failure(error);
      throw error;
    }
  }
}
