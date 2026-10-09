
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {

  private readonly storageKey = 'server_ip';

  // Obtiene la IP guardada.
  getServerIp(): string {
    return localStorage.getItem(this.storageKey) || '';
  }

  // Guarda la IP introducida en el Login.
  setServerIp(ip: string): void {
    localStorage.setItem(this.storageKey, ip.trim());
  }

  // Construye la URL de cualquier archivo de la API.
  getApiUrl(endpoint: string): string {
    const ip = this.getServerIp();

    if (!ip) {
      throw new Error('Configura la IP del servidor.');
    }

    return `http://${ip}:80/api_9b/${endpoint}`;
  }
}
