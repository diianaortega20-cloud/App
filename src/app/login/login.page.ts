
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';

// Servicio para configurar la IP del servidor.
import { ApiConfigService } from '../services/api_config.service';

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

  // Angular inyecta Router y el servicio de configuración.
  constructor(
    private router: Router,
    private apiConfig: ApiConfigService
  ) {

    // Recupera la última IP guardada.
    this.serverIp = this.apiConfig.getServerIp();

    // Detecta cuando se recupera la conexión.
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.errorMessage = '';
    });

    // Detecta cuando se pierde la conexión.
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.errorMessage =
        'Sin conexión. Verifica tu conexión e inténtalo nuevamente.';
    });
  }

  // MÉTODO PRINCIPAL DEL LOGIN
  async login(): Promise<void> {

    // Evita ejecutar varias veces el Login.
    if (
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

    // Inicia las animaciones de autenticación.
    this.startAuthenticationAnimation();

    // PETICIÓN A LA API
    try {

      // Guarda la IP para que también la utilicen los Tabs.
      this.apiConfig.setServerIp(ip);

      // Construye la URL usando la IP configurada.
      const apiUrl =
        this.apiConfig.getApiUrl('login.php');

      // Envía usuario y contraseña mediante POST.
      const response =
        await axios.post<LoginResponse>(
          apiUrl,
          {
            username: this.username.trim(),
            password: this.password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000
          }
        );

      // Comprueba la respuesta de PHP.
      if (
        !response.data.success ||
        !response.data.user
      ) {
        throw new Error(
          response.data.message ||
          'No fue posible iniciar sesión.'
        );
      }

      // LOGIN CORRECTO

      // Guarda temporalmente los datos del usuario.
      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      );

      // Finaliza la autenticación correctamente.
      this.finishAuthenticationAnimation(true);

    } catch (error: any) {

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

      // Finaliza la autenticación con error.
      this.finishAuthenticationAnimation(false);
    }
  }

  // INICIO DE LA ANIMACIÓN
  private startAuthenticationAnimation(): void {

    this.isLoginAnimating = true;

    setTimeout(() => {
      this.isLoginMoving = true;
    }, 300);

    setTimeout(() => {
      this.authenticating = true;
    }, 500);
  }

  // FINAL DE LA ANIMACIÓN
  private finishAuthenticationAnimation(
    success: boolean
  ): void {

    setTimeout(() => {
      this.authReturning = true;
      this.authenticating = false;
      this.isLoginMoving = false;
    }, 500);

    setTimeout(() => {
      this.isLoginAnimating = false;
      this.authReturning = false;

      if (success) {
        this.hideLoginContent = true;
        this.loginSuccess = true;
      }
    }, 800);

    // NAVEGACIÓN DESPUÉS DEL LOGIN
    if (success) {
      setTimeout(() => {
        this.router.navigateByUrl(
          '/tabs/tab1',
          { replaceUrl: true }
        );
      }, 1500);
    }
  }
}
