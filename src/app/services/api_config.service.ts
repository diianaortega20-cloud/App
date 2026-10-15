import { Injectable } from '@angular/core';

export interface ServerConfig {
  protocol: 'http' | 'https';
  ip: string;
  port: number;
  apiPath: string;
}

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  // JSON persistente en localStorage (no se escribe un archivo en el servidor).
  private readonly storageKey = 'api_server_config_json';
  private readonly legacyKey = 'server_ip';

  getConfig(): ServerConfig {
    const defaults: ServerConfig = { protocol: 'http', ip: '', port: 80, apiPath: 'api_9b' };
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const value = JSON.parse(saved) as Partial<ServerConfig>;
        return {
          protocol: value.protocol === 'https' ? 'https' : 'http',
          ip: typeof value.ip === 'string' ? value.ip : '',
          port: Number.isInteger(value.port) && Number(value.port) >= 1 && Number(value.port) <= 65535 ? Number(value.port) : 80,
          apiPath: 'api_9b'
        };
      }
    } catch { /* Recupera configuración por defecto si el JSON está dañado. */ }
    return { ...defaults, ip: localStorage.getItem(this.legacyKey) || '' };
  }

  saveConfig(config: ServerConfig): void {
    if (!/^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/.test(config.ip.trim())) {
      throw new Error('IP IPv4 inválida.');
    }
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      throw new Error('Puerto inválido (1-65535).');
    }
    if (config.protocol !== 'http' && config.protocol !== 'https') {
      throw new Error('Protocolo inválido.');
    }
    const safe: ServerConfig = { protocol: config.protocol, ip: config.ip.trim(), port: config.port, apiPath: 'api_9b' };
    localStorage.setItem(this.storageKey, JSON.stringify(safe));
    localStorage.setItem(this.legacyKey, safe.ip);
  }

  getServerIp(): string { return this.getConfig().ip; }
  setServerIp(ip: string): void { this.saveConfig({ ...this.getConfig(), ip }); }
  getConfigJson(): string { return JSON.stringify(this.getConfig(), null, 2); }

  getApiUrl(endpoint: string): string {
    const config = this.getConfig();
    if (!config.ip) throw new Error('Configura la IP del servidor.');
    return `${config.protocol}://${config.ip}:${config.port}/${config.apiPath}/${endpoint.replace(/^\/+/, '')}`;
  }
}
