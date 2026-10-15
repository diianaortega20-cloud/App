
import { Injectable } from '@angular/core';
import { AxiosError } from 'axios';

// Estructura de la información de diagnóstico de una petición.
export interface ApiDiagnostic {
  timestamp: string;
  method: string;
  url: string;
  network: string;
  headers: Record<string, string>;
  payload: unknown;
  httpStatus: number | null;
  result: string;
  response: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class ApiDebugService {

  // Última petición realizada.
  last: ApiDiagnostic | null = null;

  // Información del último error.
  error: ApiDiagnostic | null = null;

  // Oculta contraseñas y credenciales en los diagnósticos.
  private sanitize(data: unknown): unknown {

    // Si es un arreglo, revisa cada elemento.
    if (Array.isArray(data)) {
      return data.map(value => this.sanitize(value));
    }

    // Si es un objeto, revisa sus propiedades.
    if (data && typeof data === 'object') {

      const result: Record<string, unknown> = {};

      Object.keys(data as Record<string, unknown>).forEach((key) => {

        const value = (data as Record<string, unknown>)[key];

        // Oculta los campos sensibles.
        result[key] = /password|token|secret|authorization/i.test(key)
          ? '***'
          : this.sanitize(value);

      });

      return result;
    }

    // Devuelve directamente los valores simples.
    return data;
  }

  // INICIO DE UNA PETICIÓN HTTP
  begin(
    method: string,
    url: string,
    payload: unknown = null
  ): void {

    this.last = {

      timestamp: new Date().toLocaleString(),

      method: method,

      url: url,

      network: navigator.onLine
        ? 'Dispositivo en línea (servidor sin verificar)'
        : 'Dispositivo sin conexión',

      headers: {
        'Content-Type': 'application/json'
      },

      payload: this.sanitize(payload),

      httpStatus: null,

      result: 'Enviando solicitud...',

      response: null
    };
  }

  // PETICIÓN EXITOSA
  success(
    status: number,
    response: unknown
  ): void {

    if (!this.last) {
      return;
    }

    this.last = {
      ...this.last,

      httpStatus: status,

      result: 'Respuesta recibida',

      response: this.sanitize(response)
    };

    // Limpia el error anterior.
    this.error = null;
  }

  // ERROR EN UNA PETICIÓN HTTP
  failure(err: unknown): void {

    const e = err as AxiosError<unknown>;

    // Obtiene el estado HTTP si el servidor respondió.
    const status = e?.response?.status ?? null;

    // Determina el tipo de error.
    const result = status
      ? `Error HTTP ${status}`
      : (
          !navigator.onLine
            ? 'Sin conexión de red'
            : 'No hubo respuesta del servidor (red/CORS/timeout)'
        );

    // Conserva los datos de la petición original.
    const base: ApiDiagnostic = this.last || {

      timestamp: new Date().toLocaleString(),

      method: 'N/D',

      url: 'N/D',

      network: navigator.onLine
        ? 'En línea'
        : 'Sin conexión',

      headers: {},

      payload: null,

      httpStatus: null,

      result: '',

      response: null
    };

    // Guarda el diagnóstico del error.
    this.last = {

      ...base,

      httpStatus: status,

      result: result,

      response: this.sanitize(
        e?.response?.data ??
        e?.message ??
        'Error desconocido'
      )
    };

    // Permite mostrar el error en una ventana modal.
    this.error = this.last;
  }

  // Convierte el último diagnóstico a JSON.
  get lastJson(): string {
    return JSON.stringify(this.last, null, 2);
  }

  // Convierte el último error a JSON.
  get errorJson(): string {
    return JSON.stringify(this.error, null, 2);
  }

  // Cierra el modal de error.
  closeError(): void {
    this.error = null;
  }
}
