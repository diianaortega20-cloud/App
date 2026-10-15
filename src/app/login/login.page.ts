
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';

// Servicio para configurar la IP del servidor.
import { ApiConfigService } from '../services/api_config.service';

// Servicio para registrar el diagnóstico de las peticiones.
import { ApiDebugService } from '../services/api-debug.service';

// Define la estructura de la respuesta de login.php.
interface LoginResponse {

  success: boolean;

  message: string;

  user?: {
    id: number;
    username: string;
    email: string;
    name: string;
    status: 'active' | 'inactive';
  };
}

@Component({
  selector: 'app-login',

  templateUrl: './login.page.html',

  styleUrls: ['./login.page.scss'],

  imports: [
    IonContent,
    FormsModule,
    CommonModule
  ],
})

export class LoginPage {

  // Datos escritos por el usuario.
  username = '';
  password = '';

  // IP de la laptop donde se ejecuta XAMPP.
  serverIp = '';

  // Indica si actualmente existe conexión.
  isOnline = navigator.onLine;

  // Variables para controlar las animaciones.
  usernameFocused = false;
  passwordFocused = false;

  isLoginAnimating = false;
  isLoginMoving = false;
  authenticating = false;
  authReturning = false;

  hideLoginContent = false;
  loginSuccess = false;

  // Mensaje que se muestra cuando ocurre un error.
  errorMessage = '';

  // Guarda los temporizadores de las animaciones.
  private animationTimers: ReturnType<typeof setTimeout>[] = [];

  // Evita enviar dos peticiones simultáneamente.
  private loginInProgress = false;

  // Angular inyecta los servicios necesarios.
  constructor(
    private router: Router,
    private apiConfig: ApiConfigService,
    public debug: ApiDebugService,
    private cdr: ChangeDetectorRef
  ) {

    // Recupera la última IP guardada.
    this.serverIp = this.apiConfig.getServerIp();

    // Detecta cuando se recupera la conexión.
    window.addEventListener('online', () => {

      this.isOnline = true;

      this.errorMessage = '';

      this.refreshView();
    });

    // Detecta cuando se pierde la conexión.
    window.addEventListener('offline', () => {

      this.isOnline = false;

      this.errorMessage =
        'Sin conexión. Verifica tu conexión e inténtalo nuevamente.';

      this.refreshView();
    });
  }

  // Actualiza la interfaz de Angular.
  private refreshView(): void {
    this.cdr.detectChanges();
  }

  // MÉTODO PRINCIPAL DEL LOGIN
  async login(): Promise<void> {

    // Evita ejecutar varias veces el Login.
    if (
      this.loginInProgress ||
      this.isLoginAnimating ||
      this.authenticating
    ) {
      return;
    }

    // Limpia errores anteriores.
    this.errorMessage = '';

    // VALIDACIÓN DE LA IP

    const ip = this.serverIp.trim();

    if (!ip) {

      this.errorMessage =
        'Ingresa la IP del servidor.';

      return;
    }

    // Valida una dirección IPv4.
    const ipv4Pattern =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

    if (!ipv4Pattern.test(ip)) {

      this.errorMessage =
        'Ingresa una IP válida, por ejemplo 192.168.1.103.';

      return;
    }

    // DETECCIÓN DE CONEXIÓN

    if (!navigator.onLine) {

      this.isOnline = false;

      this.errorMessage =
        'Sin conexión. Necesitas conexión para iniciar sesión.';

      return;
    }

    this.isOnline = true;

    // VALIDACIÓN DEL FORMULARIO

    if (
      !this.username.trim() ||
      !this.password
    ) {

      this.errorMessage =
        'Ingresa tu usuario y contraseña.';

      return;
    }

    // Bloquea nuevos intentos mientras se procesa el Login.
    this.loginInProgress = true;

    // Inicia las animaciones de autenticación.
    this.startAuthenticationAnimation();

    // PETICIÓN A LA API
    try {

      // Guarda la IP para que también la utilicen los Tabs.
      this.apiConfig.setServerIp(ip);

      // Construye la URL usando la IP configurada.
      const apiUrl =
        this.apiConfig.getApiUrl('login.php');

      // Datos que se enviarán a PHP.
      const payload = {
        username: this.username.trim(),
        password: this.password
      };

      // Registra la petición para el diagnóstico.
      // ApiDebugService oculta la contraseña al mostrarla.
      this.debug.begin('POST', apiUrl, payload);

      this.refreshView();

      // Envía usuario y contraseña mediante POST.
      const response =
        await axios.post<LoginResponse>(
          apiUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json'
            },

            timeout: 10000
          }
        );

      // Comprueba la respuesta de PHP.
      if (
        !response.data.success ||
        !response.data.user
      ) {

        // Conserva la respuesta HTTP para el diagnóstico.
        const apiError: any = new Error(
          response.data.message ||
          'No fue posible iniciar sesión.'
        );

        apiError.response = response;

        throw apiError;
      }

      // LOGIN CORRECTO

      // Registra el resultado exitoso.
      this.debug.success(
        response.status,
        response.data
      );

      // Guarda temporalmente los datos del usuario.
      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      );

      this.refreshView();

      // Finaliza la autenticación correctamente.
      this.finishAuthenticationAnimation(true);

    } catch (error: any) {

      // Registra el error para mostrarlo en el diagnóstico.
      this.debug.failure(error);

      // Intenta obtener el mensaje enviado por PHP.
      const apiMessage =
        error?.response?.data?.message;

      if (!error?.response) {

        this.errorMessage =
          'No fue posible conectar con el servidor. Verifica la IP, el Wi-Fi y XAMPP.';

      } else {

        this.errorMessage =
          apiMessage ||
          error?.message ||
          'Error al iniciar sesión.';
      }

      this.refreshView();

      // Finaliza la autenticación con error.
      this.finishAuthenticationAnimation(false);
    }
  }

  // CANCELAR TEMPORIZADORES ANTERIORES
  private clearAnimationTimers(): void {

    this.animationTimers.forEach(timer => {
      clearTimeout(timer);
    });

    this.animationTimers = [];
  }

  // INICIO DE LA ANIMACIÓN
  private startAuthenticationAnimation(): void {

    // Cancela animaciones anteriores.
    this.clearAnimationTimers();

    this.isLoginAnimating = true;
    this.isLoginMoving = false;
    this.authenticating = false;
    this.authReturning = false;

    this.refreshView();

    // Mueve el formulario.
    this.animationTimers.push(
      setTimeout(() => {

        this.isLoginMoving = true;

        this.refreshView();

      }, 300)
    );

    // Muestra el indicador de autenticación.
    this.animationTimers.push(
      setTimeout(() => {

        this.authenticating = true;

        this.refreshView();

      }, 500)
    );
  }

  // FINAL DE LA ANIMACIÓN
  private finishAuthenticationAnimation(
    success: boolean
  ): void {

    // Evita que los temporizadores del inicio
    // sigan modificando la interfaz.
    this.clearAnimationTimers();

    // Oculta el indicador de autenticación.
    this.authReturning = true;
    this.authenticating = false;

    // Regresa el formulario a su posición original.
    this.isLoginMoving = false;

    this.refreshView();

    this.animationTimers.push(
      setTimeout(() => {

        // Elimina la inclinación del formulario.
        this.isLoginAnimating = false;

        this.authReturning = false;

        if (success) {

          // Muestra la confirmación del Login.
          this.hideLoginContent = true;
          this.loginSuccess = true;

        } else {

          // Si falla, mantiene visible el formulario.
          this.hideLoginContent = false;
          this.loginSuccess = false;

          // Permite intentar iniciar sesión nuevamente.
          this.loginInProgress = false;
        }

        this.refreshView();

      }, 500)
    );

    // NAVEGACIÓN DESPUÉS DEL LOGIN
    if (success) {

      this.animationTimers.push(
        setTimeout(() => {

          this.router.navigateByUrl(
            '/tabs/tab1',
            { replaceUrl: true }
          );

        }, 1500)
      );
    }
  }
}
