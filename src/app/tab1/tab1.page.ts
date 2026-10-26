import { BusinessService } from '../services/business.service';
/**
 * Administra usuarios y mantiene una copia local.
 * Sincroniza la consulta al recuperar conexión con la API.
 */

import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';

import {
  User,
  UserForm
} from '../models/user.interface';

import { UserService } from '../services/user.service';
import { ApiDebugService } from '../services/api-debug.service';
import { ApiConfigService } from '../services/api_config.service';

type ConnectionState =
  | 'checking'
  | 'online'
  | 'offline'
  | 'unavailable'
  | 'denied'
  | 'error';

interface CachedUsers {
  savedAt: string;
  users: User[];
}

@Component({
  selector: 'app-tab1',
  standalone: true,
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent
  ]
})
export class Tab1Page implements OnInit, OnDestroy {

  users: User[] = [];
  departments: any[] = [];
  form: UserForm = this.emptyForm();

  editing = false;
  loading = false;
  saving = false;

  isOnline = navigator.onLine;
  connection: ConnectionState = 'checking';

  lastSync: string | null = null;
  fromCache = false;

  message = '';
  errorMessage = '';

  private destroyed = false;
  private active = false;

  private retryTimer?: ReturnType<typeof setInterval>;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    public debug: ApiDebugService,
    private apiConfig: ApiConfigService,
    private business: BusinessService
  ) {}

  // Texto del estado actual.
  get connectionText(): string {
    const labels: Record<ConnectionState, string> = {
      checking: 'Comprobando servidor…',
      online: 'En línea · servidor disponible',
      offline: 'Sin conexión de red',
      unavailable: 'Servidor no disponible',
      denied: 'Sesión o permisos no válidos',
      error: 'Error al consultar la API'
    };

    return labels[this.connection];
  }

  // Bloquea modificaciones durante carga o desconexión.
  get canWrite(): boolean {
    return (
      this.connection === 'online' &&
      !this.loading &&
      !this.saving
    );
  }

  // Identifica la copia por servidor y usuario.
  private get cacheKey(): string {
    const user = JSON.parse(
      localStorage.getItem('user') || 'null'
    );

    if (!user || !Number.isInteger(user.id)) {
      throw new Error(
        'Inicia sesión para consultar los usuarios.'
      );
    }

    const apiUrl = this.apiConfig.getApiUrl('users.php');

    return `cached_users_v2:${apiUrl}:${user.id}`;
  }

  // Registra eventos una sola vez.
  ngOnInit(): void {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);

    // Detecta la recuperación de Apache sin cambio de red.
    this.retryTimer = setInterval(() => {
      if (
        this.active &&
        !this.saving &&
        navigator.onLine &&
        this.connection === 'unavailable'
      ) {
        void this.loadUsers();
      }
    }, 15000);
  }

  // Consulta al entrar a la pantalla.
  ionViewWillEnter(): void {
    this.active = true;
    if (navigator.onLine) {
      void this.business.request('GET', 'departments.php')
        .then(rows => { this.departments = rows; this.refreshView(); })
        .catch(() => { /* El CRUD y el caché conservan su manejo de errores. */ });
    }
    void this.loadUsers();
  }

  ionViewWillLeave(): void {
    this.active = false;
  }

  // Recupera la consulta cuando vuelve la red.
  private readonly onOnline = (): void => {
    this.isOnline = true;

    if (this.active) {
      void this.loadUsers();
    }

    this.refreshView();
  };

  // Conserva el formulario y muestra la copia local.
  private readonly onOffline = (): void => {
    this.isOnline = false;

    // No sustituye un rechazo de permisos por acceso al caché.
    if (this.connection !== 'denied') {
      this.connection = 'offline';

      if (!this.loading) {
        this.loadCachedUsers();
      }
    }

    this.refreshView();
  };

  private refreshView(): void {
    if (!this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  // Comprueba los datos antes de usarlos.
  private validUsers(value: unknown): value is User[] {
    return (
      Array.isArray(value) &&
      value.every(user =>
        user &&
        Number.isInteger(user.id) &&
        typeof user.username === 'string' &&
        typeof user.name === 'string' &&
        typeof user.email === 'string' &&
        (
          user.status === 'active' ||
          user.status === 'inactive'
        )
      )
    );
  }

  // Lee la última copia del usuario y servidor actuales.
  private loadCachedUsers(): void {
    this.users = [];
    this.lastSync = null;
    this.fromCache = false;

    try {
      const raw = localStorage.getItem(this.cacheKey);

      if (!raw) {
        this.errorMessage =
          'No hay una copia local para este usuario y servidor.';
        return;
      }

      const cached: CachedUsers = JSON.parse(raw);

      if (
        !this.validUsers(cached.users) ||
        typeof cached.savedAt !== 'string' ||
        !Number.isFinite(Date.parse(cached.savedAt))
      ) {
        throw new Error(
          'La copia local no es válida. Sincroniza al recuperar conexión.'
        );
      }

      this.users = cached.users;
      this.lastSync = cached.savedAt;
      this.fromCache = true;

      this.errorMessage =
        'Mostrando la última copia local. Puede estar desactualizada.';

    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No fue posible recuperar la copia local.';
    }
  }

  // Elimina la copia cuando la API rechaza el acceso.
  private denyAccess(status: number): void {
    this.connection = 'denied';
    this.users = [];
    this.lastSync = null;
    this.fromCache = false;

    try {
      localStorage.removeItem(this.cacheKey);
    } catch {
      // El almacenamiento puede no estar disponible.
    }

    if (status === 401) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_expires_at');
    }

    this.errorMessage = status === 401
      ? 'La sesión no es válida. Vuelve a iniciar sesión.'
      : 'No tienes permiso para consultar o modificar usuarios.';
  }

  // Consulta la API y actualiza la copia local.
  async loadUsers(): Promise<void> {
    if (this.loading || this.destroyed) {
      return;
    }

    const accessWasDenied = this.connection === 'denied';

    this.loading = true;
    this.errorMessage = '';
    this.isOnline = navigator.onLine;

    if (!this.isOnline && accessWasDenied) {
      this.loading = false;
      this.errorMessage =
        'Necesitas recuperar conexión e iniciar una sesión válida.';
      this.refreshView();
      return;
    }

    this.connection = this.isOnline
      ? 'checking'
      : 'offline';

    this.refreshView();

    try {
      if (!this.isOnline) {
        this.loadCachedUsers();
        return;
      }

      // Conserva la identidad de esta consulta.
      const requestedKey = this.cacheKey;

      const users = await this.userService.getUsers();

      if (this.destroyed) {
        return;
      }

      // Descarta respuestas de otra configuración o cuenta.
      if (requestedKey !== this.cacheKey) {
        this.users = [];
        this.fromCache = false;
        this.lastSync = null;
        this.connection = 'error';
        this.errorMessage =
          'Cambió el usuario o servidor. Pulsa Sincronizar ahora.';
        return;
      }

      if (!navigator.onLine) {
        this.isOnline = false;
        this.connection = 'offline';
        this.loadCachedUsers();
        return;
      }

      if (!this.validUsers(users)) {
        throw new Error(
          'La API devolvió una lista de usuarios inválida.'
        );
      }

      this.users = users;
      this.fromCache = false;
      this.connection = 'online';

      const savedAt = new Date().toISOString();

      try {
        const cache: CachedUsers = {
          savedAt,
          users
        };

        localStorage.setItem(
          requestedKey,
          JSON.stringify(cache)
        );

        this.lastSync = savedAt;

      } catch {
        this.lastSync = null;

        this.errorMessage =
          'Consulta correcta, pero no se pudo guardar la copia local.';
      }

    } catch (error: any) {
      if (this.destroyed) {
        return;
      }

      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        this.denyAccess(status);

      } else if (
        (!status && error?.isAxiosError) ||
        status >= 500
      ) {
        this.isOnline = navigator.onLine;

        this.connection = this.isOnline
          ? 'unavailable'
          : 'offline';

        this.loadCachedUsers();

      } else {
        this.connection = 'error';
        this.users = [];
        this.fromCache = false;
        this.lastSync = null;

        this.errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible consultar la API.';
      }

    } finally {
      this.loading = false;
      this.refreshView();
    }
  }

  // POST o PUT según el modo del formulario.
  async saveUser(): Promise<void> {
    if (!this.canWrite) {
      return;
    }

    this.message = '';
    this.errorMessage = '';

    if (
      !this.form.username.trim() ||
      !this.form.name.trim() ||
      !this.form.email.trim()
    ) {
      this.errorMessage =
        'Usuario, nombre y correo son obligatorios.';
      return;
    }

    if (!this.editing && !this.form.password) {
      this.errorMessage =
        'La contraseña es obligatoria para usuarios nuevos.';
      return;
    }

    const data = { ...this.form };
    const updating = this.editing && data.id !== null;

    await this.mutate(
      () => updating
        ? this.userService.updateUser(data)
        : this.userService.createUser(data),
      true
    );
  }

  // Coloca los datos en el formulario.
  editUser(user: User): void {
    if (!this.canWrite) {
      return;
    }

    this.editing = true;

    this.form = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      password: '',
      status: user.status,
      role: user.role || 'employee',
      department_id: user.department_id ?? null,
      position: user.position ?? null
    };
  }

  // PATCH: cambia el estado.
  async toggleStatus(user: User): Promise<void> {
    if (!this.canWrite) {
      return;
    }

    await this.mutate(
      () => this.userService.updateStatus(user)
    );
  }

  // DELETE: solicita confirmación.
  async deleteUser(user: User): Promise<void> {
    if (!this.canWrite || user.id === 1) {
      return;
    }

    if (!confirm(`¿Eliminar al usuario ${user.username}?`)) {
      return;
    }

    await this.mutate(
      () => this.userService.deleteUser(user.id)
    );
  }

  // Controla carga y evita envíos repetidos.
  private async mutate(
    operation: () => Promise<any>,
    reset = false
  ): Promise<void> {
    if (!navigator.onLine) {
      this.onOffline();
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.refreshView();

    try {
      const result = await operation();

      if (this.destroyed) {
        return;
      }

      this.message =
        result.message || 'Operación realizada.';

      if (reset) {
        this.resetForm();
      }

      // Actualiza tabla y copia después de modificar.
      await this.loadUsers();

    } catch (error: any) {
      if (this.destroyed) {
        return;
      }

      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        this.denyAccess(status);

      } else {
        if (!status || status >= 500) {
          this.isOnline = navigator.onLine;

          this.connection = this.isOnline
            ? 'unavailable'
            : 'offline';
        }

        this.errorMessage =
          error?.response?.data?.message ||
          'No se confirmó la modificación. Sincroniza y revisa la lista antes de reenviarla.';
      }

    } finally {
      this.saving = false;
      this.refreshView();
    }
  }

  // Limpia únicamente el formulario.
  resetForm(): void {
    this.editing = false;
    this.form = this.emptyForm();
  }

  private emptyForm(): UserForm {
    return {
      id: null,
      username: '',
      email: '',
      name: '',
      password: '',
      status: 'active',
      role: 'employee',
      department_id: null,
      position: null
    };
  }

  // Libera eventos y reintentos.
  ngOnDestroy(): void {
    this.destroyed = true;

    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);

    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }
}