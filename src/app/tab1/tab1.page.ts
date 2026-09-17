import {
  ChangeDetectorRef,
  Component,
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

  // ==========================================
  // Lista de usuarios
  // ==========================================

  users: User[] = [];


  // ==========================================
  // Formulario
  // ==========================================

  form: UserForm = {
    id: null,
    username: '',
    email: '',
    name: '',
    password: '',
    status: 'active'
  };


  // ==========================================
  // Estados de la interfaz
  // ==========================================

  editing = false;
  loading = false;

  message = '';
  errorMessage = '';


  // ==========================================
  // Constructor
  // ==========================================

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}


  // ==========================================
  // Al iniciar Tab1
  // ==========================================

  ngOnInit(): void {
    this.loadUsers();
  }


  // ==========================================
  // GET - Consultar usuarios
  // ==========================================

  async loadUsers(): Promise<void> {

    this.loading = true;
    this.errorMessage = '';

    try {

      this.users =
        await this.userService.getUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible cargar los usuarios.';

    } finally {

      this.loading = false;

      // Fuerza la actualización visual después
      // de finalizar la petición realizada con Axios
      this.cdr.detectChanges();
    }
  }


  // ==========================================
  // POST / PUT - Crear o actualizar usuario
  // ==========================================

  async saveUser(): Promise<void> {

    this.message = '';
    this.errorMessage = '';

    // Validar campos obligatorios
    if (
      !this.form.username.trim() ||
      !this.form.email.trim() ||
      !this.form.name.trim()
    ) {

      this.errorMessage =
        'Usuario, nombre y correo son obligatorios.';

      return;
    }


    // La contraseña es obligatoria
    // únicamente al crear un usuario
    if (
      !this.editing &&
      !this.form.password
    ) {

      this.errorMessage =
        'La contraseña es obligatoria para usuarios nuevos.';

      return;
    }


    try {

      // ======================================
      // PUT - Actualizar
      // ======================================

      if (
        this.editing &&
        this.form.id !== null
      ) {

        const response =
          await this.userService.updateUser(
            this.form
          );

        this.message =
          response.message;

      }

      // ======================================
      // POST - Crear
      // ======================================

      else {

        const response =
          await this.userService.createUser(
            this.form
          );

        this.message =
          response.message;
      }


      // Limpiar formulario
      this.resetForm();

      // Actualizar lista
      await this.loadUsers();


    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible guardar el usuario.';

      this.cdr.detectChanges();
    }
  }


  // ==========================================
  // Cargar usuario en formulario para editar
  // ==========================================

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


    // Subir al formulario
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  // ==========================================
  // PATCH - Cambiar estado
  // ==========================================

  async toggleStatus(
    user: User
  ): Promise<void> {

    this.message = '';
    this.errorMessage = '';

    try {

      const response =
        await this.userService.updateStatus(
          user
        );

      this.message =
        response.message;

      // Recargar usuarios
      await this.loadUsers();


    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible cambiar el estado.';

      this.cdr.detectChanges();
    }
  }


  // ==========================================
  // DELETE - Eliminar usuario
  // ==========================================

  async deleteUser(
    user: User
  ): Promise<void> {

    this.message = '';
    this.errorMessage = '';


    // Evitar eliminar administrador principal
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

      const response =
        await this.userService.deleteUser(
          user.id
        );

      this.message =
        response.message;

      // Recargar lista
      await this.loadUsers();


    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible eliminar el usuario.';

      this.cdr.detectChanges();
    }
  }


  // ==========================================
  // Limpiar formulario
  // ==========================================

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