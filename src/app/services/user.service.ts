/**
 * Realiza las operaciones de usuarios mediante Axios.
 * Envía el token de sesión y registra el diagnóstico.
 */

import { Injectable } from '@angular/core';
import axios from 'axios';

import { ApiConfigService } from './api_config.service';
import { ApiDebugService } from './api-debug.service';

import {
  User,
  UserForm
} from '../models/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private apiConfig: ApiConfigService,
    private debug: ApiDebugService
  ) {}

  // Construye la dirección usando la configuración actual.
  private get apiUrl(): string {
    return this.apiConfig.getApiUrl('users.php');
  }

  // Centraliza las solicitudes y sus errores.
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload?: unknown
  ): Promise<any> {

    this.debug.begin(method, url, payload);

    try {
      const token = sessionStorage.getItem('auth_token');

      const response = await axios.request({
        method,
        url,
        data: payload,
        timeout: 10000,
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {}
      });

      if (response.data?.success !== true) {
        const error = Object.assign(
          new Error(
            response.data?.message ||
            'La API no confirmó la operación.'
          ),
          { response }
        );

        throw error;
      }

      this.debug.success(
        response.status,
        response.data
      );

      return response;

    } catch (error) {
      this.debug.failure(error);
      throw error;
    }
  }

  // GET: consulta los usuarios.
  async getUsers(): Promise<User[]> {
    const response = await this.request(
      'GET',
      this.apiUrl
    );

    if (!Array.isArray(response.data.users)) {
      throw new Error(
        'La API no devolvió una lista de usuarios válida.'
      );
    }

    return response.data.users;
  }

  // POST: crea un usuario.
  async createUser(form: UserForm): Promise<any> {
    const response = await this.request(
      'POST',
      this.apiUrl,
      {
        username: form.username,
        email: form.email,
        name: form.name,
        password: form.password,
        status: form.status,
        role: form.role,
        department_id: form.department_id,
        position: form.position
      }
    );

    return response.data;
  }

  // PUT: actualiza un usuario.
  async updateUser(form: UserForm): Promise<any> {
    const response = await this.request(
      'PUT',
      `${this.apiUrl}?id=${form.id}`,
      {
        username: form.username,
        email: form.email,
        name: form.name,
        password: form.password,
        status: form.status,
        role: form.role,
        department_id: form.department_id,
        position: form.position
      }
    );

    return response.data;
  }

  // PATCH: cambia el estado.
  async updateStatus(user: User): Promise<any> {
    const status = user.status === 'active'
      ? 'inactive'
      : 'active';

    const response = await this.request(
      'PATCH',
      `${this.apiUrl}?id=${user.id}`,
      { status }
    );

    return response.data;
  }

  // DELETE: elimina un usuario.
  async deleteUser(id: number): Promise<any> {
    const response = await this.request(
      'DELETE',
      `${this.apiUrl}?id=${id}`
    );

    return response.data;
  }
}