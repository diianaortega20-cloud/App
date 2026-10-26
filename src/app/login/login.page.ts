/**
 * Inicia sesión y guarda el token temporal.
 * Conserva las animaciones de la pantalla de acceso.
 */

import {
  Component,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';

import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';

import { ApiConfigService } from '../services/api_config.service';
import { ApiDebugService } from '../services/api-debug.service';

// Respuesta del login actualizado.
interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  expires_at: string;

  user?: {
    id: number;
    username: string;
    email: string;
    name: string;
    status: 'active' | 'inactive';
    role: 'admin' | 'employee';
    department_id: number | null;
    position: string | null;
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonContent,
    FormsModule,
    CommonModule
  ]
})
export class LoginPage implements OnDestroy {

  username = '';
  password = '';
  serverIp = '';

  isOnline = navigator.onLine;

  usernameFocused = false;
  passwordFocused = false;

  isLoginAnimating = false;
  isLoginMoving = false;
  authenticating = false;
  authReturning = false;

  hideLoginContent = false;
  loginSuccess = false;

  errorMessage = '';

  private animationTimers: ReturnType<typeof setTimeout>[] = [];
  private loginInProgress = false;
  private destroyed = false;

  constructor(
    private router: Router,
    private apiConfig: ApiConfigService,
    public debug: ApiDebugService,
    private cdr: ChangeDetectorRef
  ) {
    this.serverIp = this.apiConfig.getServerIp();

    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  // Restablece el formulario cuando se vuelve al login.
  ionViewWillEnter(): void {
    this.clearAnimationTimers();

    this.loginInProgress = false;
    this.isLoginAnimating = false;
    this.isLoginMoving = false;
    this.authenticating = false;
    this.authReturning = false;
    this.hideLoginContent = false;
    this.loginSuccess = false;

    this.password = '';
    this.errorMessage = '';
    this.isOnline = navigator.onLine;
    this.serverIp = this.apiConfig.getServerIp();
  }

  // Actualiza el estado de red.
  private readonly onOnline = (): void => {
    this.isOnline = true;
    this.errorMessage = '';
    this.refreshView();
  };

  private readonly onOffline = (): void => {
    this.isOnline = false;
    this.errorMessage =
      'Sin conexión. Necesitas acceso al servidor para iniciar sesión.';

    this.refreshView();
  };

  private refreshView(): void {
    if (!this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  // Valida y envía las credenciales.
  async login(): Promise<void> {
    if (
      this.loginInProgress ||
      this.isLoginAnimating ||
      this.authenticating
    ) {
      return;
    }

    this.errorMessage = '';

    const ip = this.serverIp.trim();

    const ipv4Pattern =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

    if (!ipv4Pattern.test(ip)) {
      this.errorMessage =
        'Ingresa una dirección IPv4 válida del servidor.';
      return;
    }

    if (!navigator.onLine) {
      this.isOnline = false;
      this.errorMessage =
        'Necesitas conexión para iniciar sesión.';
      return;
    }

    if (!this.username.trim() || !this.password) {
      this.errorMessage =
        'Ingresa tu usuario y contraseña.';
      return;
    }

    this.isOnline = true;
    this.loginInProgress = true;
    this.startAuthenticationAnimation();

    try {
      this.apiConfig.setServerIp(ip);

      const apiUrl = this.apiConfig.getApiUrl('login.php');

      const payload = {
        username: this.username.trim(),
        password: this.password
      };

      this.debug.begin('POST', apiUrl, payload);
      this.refreshView();

      const response = await axios.post<LoginResponse>(
        apiUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (this.destroyed) {
        return;
      }

      if (
        !response.data.success ||
        !response.data.user ||
        !response.data.token ||
        !response.data.expires_at
      ) {
        throw Object.assign(
          new Error(
            response.data.message ||
            'El servidor no devolvió una sesión válida.'
          ),
          { response }
        );
      }

      // Guarda los datos públicos y la credencial temporal.
      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      );

      sessionStorage.setItem(
        'auth_token',
        response.data.token
      );

      sessionStorage.setItem(
        'auth_expires_at',
        response.data.expires_at
      );

      this.debug.success(
        response.status,
        response.data
      );

      this.finishAuthenticationAnimation(true);

    } catch (error: any) {
      if (this.destroyed) {
        return;
      }

      this.debug.failure(error);

      this.errorMessage = error?.response
        ? (
            error.response.data?.message ||
            error.message ||
            'No fue posible iniciar sesión.'
          )
        : 'No fue posible conectar. Revisa la IP, la red y XAMPP.';

      this.finishAuthenticationAnimation(false);
    }
  }

  // Cancela los temporizadores pendientes.
  private clearAnimationTimers(): void {
    this.animationTimers.forEach(timer => {
      clearTimeout(timer);
    });

    this.animationTimers = [];
  }

  // Inicia la animación existente.
  private startAuthenticationAnimation(): void {
    this.clearAnimationTimers();

    this.isLoginAnimating = true;
    this.isLoginMoving = false;
    this.authenticating = false;
    this.authReturning = false;

    this.refreshView();

    this.animationTimers.push(
      setTimeout(() => {
        this.isLoginMoving = true;
        this.refreshView();
      }, 300)
    );

    this.animationTimers.push(
      setTimeout(() => {
        this.authenticating = true;
        this.refreshView();
      }, 500)
    );
  }

  // Finaliza la animación y navega si hubo éxito.
  private finishAuthenticationAnimation(
    success: boolean
  ): void {
    this.clearAnimationTimers();

    this.authReturning = true;
    this.authenticating = false;
    this.isLoginMoving = false;

    this.refreshView();

    this.animationTimers.push(
      setTimeout(() => {
        this.isLoginAnimating = false;
        this.authReturning = false;

        this.hideLoginContent = success;
        this.loginSuccess = success;

        if (!success) {
          this.loginInProgress = false;
        }

        this.refreshView();
      }, 500)
    );

    if (success) {
      this.animationTimers.push(
        setTimeout(() => {
          void this.router.navigateByUrl(
            JSON.parse(localStorage.getItem('user') || 'null')?.role === 'admin'
              ? '/tabs/tab1' : '/tabs/tab3',
            { replaceUrl: true }
          );
        }, 1500)
      );
    }
  }

  // Libera eventos y temporizadores.
  ngOnDestroy(): void {
    this.destroyed = true;

    this.clearAnimationTimers();

    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}