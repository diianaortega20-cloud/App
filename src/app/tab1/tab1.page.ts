import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

interface UserForm {
  id: number | null;
  username: string;
  email: string;
  name: string;
  password: string;
  status: 'active' | 'inactive';
}

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent
  ]
})
export class Tab1Page implements OnInit {

  private readonly apiUrl =
    'http://localhost/api_9b/users.php';

  users: User[] = [];

  form: UserForm = {
    id: null,
    username: '',
    email: '',
    name: '',
    password: '',
    status: 'active'
  };

  editing = false;
  loading = false;

  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {

      const response = await axios.get(this.apiUrl);

      if (response.data.success) {
        this.users = response.data.users;
      }

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible cargar los usuarios.';

    } finally {

      this.loading = false;
    }
  }

  async saveUser(): Promise<void> {

    this.message = '';
    this.errorMessage = '';

    if (
      !this.form.username.trim() ||
      !this.form.email.trim() ||
      !this.form.name.trim()
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

    try {

      if (this.editing && this.form.id !== null) {

        const response = await axios.put(
          `${this.apiUrl}?id=${this.form.id}`,
          {
            username: this.form.username,
            email: this.form.email,
            name: this.form.name,
            password: this.form.password,
            status: this.form.status
          }
        );

        this.message = response.data.message;

      } else {

        const response = await axios.post(
          this.apiUrl,
          {
            username: this.form.username,
            email: this.form.email,
            name: this.form.name,
            password: this.form.password,
            status: this.form.status
          }
        );

        this.message = response.data.message;
      }

      this.resetForm();

      await this.loadUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible guardar el usuario.';
    }
  }

  editUser(user: User): void {

    this.editing = true;

    this.form = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      password: '',
      status: user.status
    };

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async toggleStatus(user: User): Promise<void> {

    const newStatus: 'active' | 'inactive' =
      user.status === 'active'
        ? 'inactive'
        : 'active';

    try {

      const response = await axios.patch(
        `${this.apiUrl}?id=${user.id}`,
        {
          status: newStatus
        }
      );

      this.message = response.data.message;

      await this.loadUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible cambiar el estado.';
    }
  }

  async deleteUser(user: User): Promise<void> {

    if (user.id === 1) {
      this.errorMessage =
        'No elimines el administrador principal.';
      return;
    }

    const confirmed = confirm(
      `¿Eliminar al usuario ${user.username}?`
    );

    if (!confirmed) {
      return;
    }

    try {

      const response = await axios.delete(
        `${this.apiUrl}?id=${user.id}`
      );

      this.message = response.data.message;

      await this.loadUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible eliminar el usuario.';
    }
  }

  resetForm(): void {

    this.editing = false;

    this.form = {
      id: null,
      username: '',
      email: '',
      name: '',
      password: '',
      status: 'active'
    };
  }
}