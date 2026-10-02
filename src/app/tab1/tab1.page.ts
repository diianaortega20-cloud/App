import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';

// Interfaces que definen la estructura de usuarios y del formulario.
import {
  User,
  UserForm
} from '../models/user.interface';

// Servicio encargado de realizar las operaciones con la API.
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

  // Lista donde se guardan los usuarios obtenidos de la API.
  users: User[] = [];

  // Datos vinculados al formulario de crear o editar usuario.
  form: UserForm = {
    id: null,
    username: '',
    email: '',
    name: '',
    password: '',
    status: 'active'
  };

  // Indica si el formulario está editando un usuario.
  editing = false;

  loading = false;

  // Indica si el navegador tiene conexión.
  isOnline = navigator.onLine;

  // Nombre utilizado para guardar los usuarios en caché.
  private readonly cacheKey = 'cached_users';

  // Mensajes de éxito y error mostrados en la interfaz.
  message = '';
  errorMessage = '';

  // Inyecta el servicio de usuarios y el detector de cambios.
  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  // Se ejecuta al iniciar Tab1.
  ngOnInit(): void {

    // Obtiene el estado inicial de la conexión.
    this.isOnline = navigator.onLine;

    // Detecta cuando se recupera la conexión.
    window.addEventListener('online', () => {

      this.isOnline = true;

      this.message =
        'Conexión restablecida.';

      this.errorMessage = '';

      // Vuelve a consultar la API.
      this.loadUsers();

      this.cdr.detectChanges();
    });

    // Detecta cuando se pierde la conexión.
    window.addEventListener('offline', () => {

      this.isOnline = false;

      this.message = '';

      this.errorMessage =
        'Sin conexión. Mostrando datos almacenados.';

      // Recupera los últimos usuarios guardados.
      this.loadCachedUsers();

      this.cdr.detectChanges();
    });

    // Carga los usuarios al iniciar.
    this.loadUsers();
  }


  // Guarda la lista actual de usuarios en el almacenamiento local.
  private saveUsersToCache(): void {

    localStorage.setItem(
      this.cacheKey,
      JSON.stringify(this.users)
    );
  }


  // Recupera los usuarios almacenados en caché.
  private loadCachedUsers(): void {

    const cachedUsers =
      localStorage.getItem(this.cacheKey);

    if (cachedUsers) {

      try {

        this.users =
          JSON.parse(cachedUsers) as User[];

      } catch {

        // Si los datos almacenados están dañados, elimina el caché.
        localStorage.removeItem(
          this.cacheKey
        );

        this.users = [];

        this.errorMessage =
          'No fue posible recuperar los datos almacenados.';
      }

    } else {

      this.users = [];

      this.errorMessage =
        'Sin conexión y no hay datos almacenados.';
    }
  }


  // GET: obtiene la lista de usuarios mediante UserService.
  async loadUsers(): Promise<void> {

    // Activa el estado de carga y limpia errores anteriores.
    this.loading = true;
    this.errorMessage = '';

    try {

      // Si no hay conexión, utiliza directamente el caché.
      if (!navigator.onLine) {

        this.isOnline = false;

        this.loadCachedUsers();

        // Si existe caché, muestra este mensaje.
        if (this.users.length > 0) {

          this.errorMessage =
            'Sin conexión. Mostrando datos almacenados.';
        }

        return;
      }

      // Indica que existe conexión.
      this.isOnline = true;

      // Espera los usuarios obtenidos por el servicio.
      this.users =
        await this.userService.getUsers();

      // Guarda una copia de los usuarios para uso offline.
      this.saveUsersToCache();

    } catch (error: any) {

      // La red puede existir aunque PHP o Apache no respondan.
      // En ese caso también intentamos recuperar el caché.
      this.loadCachedUsers();

      if (this.users.length > 0) {

        this.errorMessage =
          'No fue posible conectar con el servidor. Mostrando datos almacenados.';

      } else {

        this.errorMessage =
          error?.response?.data?.message ||
          'No fue posible cargar los usuarios.';
      }

    } finally {

      // Finaliza la carga aunque la petición tenga éxito o error.
      this.loading = false;

      // Fuerza a Angular a reflejar los cambios hechos tras Axios.
      this.cdr.detectChanges();
    }
  }


  // POST o PUT: crea o actualiza según el estado editing.
  async saveUser(): Promise<void> {

    // Limpia mensajes anteriores.
    this.message = '';
    this.errorMessage = '';

    // No permite modificar información sin conexión.
    if (!navigator.onLine) {

      this.isOnline = false;

      this.errorMessage =
        'Necesitas conexión para guardar cambios.';

      return;
    }

    // Comprueba que los campos obligatorios tengan información.
    if (
      !this.form.username.trim() ||
      !this.form.email.trim() ||
      !this.form.name.trim()
    ) {

      this.errorMessage =
        'Usuario, nombre y correo son obligatorios.';

      return;
    }

    // Exige contraseña solamente cuando se crea un usuario.
    if (
      !this.editing &&
      !this.form.password
    ) {

      this.errorMessage =
        'La contraseña es obligatoria para usuarios nuevos.';

      return;
    }

    try {

      // Si estamos editando y existe ID, realiza un PUT.
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

      } else {

        // Si no estamos editando, realiza un POST.
        const response =
          await this.userService.createUser(
            this.form
          );

        this.message =
          response.message;
      }

      // Limpia el formulario después de guardar.
      this.resetForm();

      // Actualiza la tabla y también el caché.
      await this.loadUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible guardar el usuario. Verifica la conexión con el servidor.';

      this.cdr.detectChanges();
    }
  }


  // Coloca un usuario existente en el formulario para editarlo.
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


  // PATCH: cambia únicamente el estado activo/inactivo.
  async toggleStatus(
    user: User
  ): Promise<void> {

    this.message = '';
    this.errorMessage = '';

    // No permite cambiar el estado sin conexión.
    if (!navigator.onLine) {

      this.isOnline = false;

      this.errorMessage =
        'Necesitas conexión para cambiar el estado.';

      return;
    }

    try {

      const response =
        await this.userService.updateStatus(
          user
        );

      this.message =
        response.message;

      // Actualiza la tabla y el caché.
      await this.loadUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible cambiar el estado. Verifica la conexión con el servidor.';

      this.cdr.detectChanges();
    }
  }


  // DELETE: elimina un usuario mediante su ID.
  async deleteUser(
    user: User
  ): Promise<void> {

    this.message = '';
    this.errorMessage = '';

    // No permite eliminar usuarios sin conexión.
    if (!navigator.onLine) {

      this.isOnline = false;

      this.errorMessage =
        'Necesitas conexión para eliminar usuarios.';

      return;
    }

    // Impide eliminar al administrador principal con ID 1.
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

      // Actualiza la tabla y el caché.
      await this.loadUsers();

    } catch (error: any) {

      this.errorMessage =
        error?.response?.data?.message ||
        'No fue posible eliminar el usuario. Verifica la conexión con el servidor.';

      this.cdr.detectChanges();
    }
  }


  // Regresa el formulario a su estado inicial.
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