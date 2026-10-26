/** Consulta el perfil real y cierra la sesión actual mediante la API configurada. */
import { Injectable } from '@angular/core';
import axios from 'axios';
import { ApiConfigService } from './api_config.service';
import { ApiDebugService } from './api-debug.service';

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  name: string;
  status: 'active' | 'inactive';
  role: 'admin' | 'employee';
  department_id: number | null;
  position: string | null;
  department_name?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private config: ApiConfigService,
    private debug: ApiDebugService
  ) {}

  // No añade el token a servicios externos ni modifica Axios globalmente.
  private async request(method: 'GET' | 'POST' | 'PATCH', endpoint: string, data?: unknown): Promise<any> {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      throw Object.assign(new Error('Inicia sesión nuevamente.'), { status: 401 });
    }
    const url = this.config.getApiUrl(endpoint);
    this.debug.begin(method, url, data);
    try {
      const response = await axios.request({
        method, url, data, timeout: 10000,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sessionStorage.getItem('auth_token') !== token) {
        throw new Error('La sesión cambió durante la consulta. Actualiza el perfil.');
      }
      if (response.data?.success !== true) {
        throw Object.assign(new Error(response.data?.message || 'Respuesta no válida.'), { response });
      }
      this.debug.success(response.status, response.data);
      return response.data;
    } catch (error) {
      this.debug.failure(error);
      throw error;
    }
  }

  // Obtiene los datos actuales sin recurrir al perfil de ejemplo.
  async getProfile(): Promise<SessionUser> {
    const response = await this.request('GET', 'me.php');
    const user = response.data as SessionUser;
    if (!user || !Number.isInteger(user.id) || typeof user.name !== 'string' ||
        typeof user.username !== 'string' || typeof user.email !== 'string' ||
        !['admin', 'employee'].includes(user.role)) {
      throw new Error('El servidor devolvió un perfil no válido.');
    }
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  async updateProfile(name: string, email: string): Promise<SessionUser> {
    const response = await this.request('PATCH', 'me.php', { name, email });
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  // Primero revoca el token; después retira los datos locales.
  async logout(): Promise<void> {
    const token = sessionStorage.getItem('auth_token');
    try {
      await this.request('POST', 'logout.php');
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      // Un token vencido o revocado ya no permite acceder.
      if (status !== 401) throw error;
    }
    if (sessionStorage.getItem('auth_token') === token) this.clearLocalSession();
  }

  clearLocalSession(): void {
    // Limpia solo la copia de usuarios del servidor y la cuenta actuales.
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (Number.isInteger(user?.id)) {
        const url = this.config.getApiUrl('users.php');
        localStorage.removeItem(`cached_users_v2:${url}:${user.id}`);
      }
    } catch { /* La limpieza del token continúa aunque no haya copia válida. */ }
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_expires_at');
    localStorage.removeItem('user');
    // Conserva la configuración del servidor.
    this.debug.closeError();
  }
}
