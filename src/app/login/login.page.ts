// Component permite crear el componente LoginPage.
import { Component } from '@angular/core';

// Router permite navegar entre páginas de Angular.
import { Router } from '@angular/router';

// IonContent es el contenido principal de una página Ionic.
import { IonContent } from '@ionic/angular';

// FormsModule permite utilizar formularios y ngModel.
import { FormsModule } from '@angular/forms';

// CommonModule permite utilizar funciones como *ngIf.
import { CommonModule } from '@angular/common';

// Axios permite realizar peticiones HTTP a la API PHP.
import axios from 'axios';


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


// CLASE PRINCIPAL DEL LOGIN
export class LoginPage {

  // Datos escritos por el usuario.
  username = '';
  password = '';


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


  // Dirección de la API encargada del Login.
  private readonly apiUrl =
    'http://localhost/api_9b/login.php';


  // Angular inyecta Router para permitir la navegación.
  constructor(private router: Router) {

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


    // DETECCIÓN DE CONEXIÓN

    // Comprueba si el dispositivo está sin conexión.
    if (!navigator.onLine) {

      this.isOnline = false;

      this.errorMessage =
        'Sin conexión. Necesitas conexión para iniciar sesión.';

      return;
    }


    // Si existe conexión actualizamos la variable.
    this.isOnline = true;


    // VALIDACIÓN DEL FORMULARIO

    // Comprueba que exista usuario y contraseña.
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

      // Envía usuario y contraseña mediante POST.
      const response =
        await axios.post<LoginResponse>(

          this.apiUrl,

          {
            username: this.username.trim(),
            password: this.password,
          },

          {
            headers: {

              'Content-Type': 'application/json',

            },
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


      // Si existe conexión pero la API no responde,
      // mostramos un mensaje adecuado.
      if (!error?.response) {

        this.errorMessage =
          'No fue posible conectar con el servidor.';

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