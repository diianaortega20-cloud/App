import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';

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
  username = '';
  password = '';

  usernameFocused = false;
  passwordFocused = false;

  isLoginAnimating = false;
  isLoginMoving = false;
  authenticating = false;
  authReturning = false;
  hideLoginContent = false;
  loginSuccess = false;

  errorMessage = '';

  // Cambia esta URL por la dirección real donde publiques la carpeta api.
  private readonly apiUrl = 'http://localhost/api_9b/login.php';

  constructor(private router: Router) { }

  async login(): Promise<void> {
    if (this.isLoginAnimating || this.authenticating) {
      return;
    }

    this.errorMessage = '';

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Ingresa tu usuario y contraseña.';
      return;
    }

    this.startAuthenticationAnimation();

    try {
      const response = await axios.post<LoginResponse>(
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

      if (!response.data.success || !response.data.user) {
        throw new Error(response.data.message || 'No fue posible iniciar sesión.');
      }

      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.finishAuthenticationAnimation(true);
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      this.errorMessage = apiMessage || error?.message || 'Error al conectar con el servidor.';
      this.finishAuthenticationAnimation(false);
    }
  }

  private startAuthenticationAnimation(): void {
    this.isLoginAnimating = true;

    setTimeout(() => {
      this.isLoginMoving = true;
    }, 300);

    setTimeout(() => {
      this.authenticating = true;
    }, 500);
  }

  private finishAuthenticationAnimation(success: boolean): void {
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

    if (success) {
      setTimeout(() => {
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
      }, 1500);
    }
  }
}
