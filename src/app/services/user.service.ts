import { Injectable } from '@angular/core';

import axios from 'axios';


// Importamos las dos interfaces que creamos.
import {
  User,
  UserForm
} from '../models/user.interface';

@Injectable({

  providedIn: 'root'
})

// Esta clase concentra las operaciones de acceso a datos relacionadas con los usuarios.
export class UserService {
  
  // URL del archivo PHP encargado del CRUD de usuarios.
  private readonly apiUrl =
    'http://localhost/api_9b/users.php';

  async getUsers(): Promise<User[]> {


    // Realizamos una petición HTTP GET a users.php. await hace que esperemos la respuesta de la API
    const response =
      await axios.get(this.apiUrl);

    if (response.data.success) {

      return response.data.users;
    }


    // Si la API no indicó éxito,regresamos una lista vacía.
    return [];
  }
  
  // Recibe un objeto de tipo UserForm.
  async createUser(
    form: UserForm
  ): Promise<any> {


    const response = await axios.post(

      // Endpoint.
      this.apiUrl,

      // Datos que enviaremos a PHP en el cuerpo
      {
        username: form.username,
        email: form.email,
        name: form.name,
        password: form.password,
        status: form.status
      }
    );


    // Regresamos a Tab1Page la respuesta que users.php nos haya enviado.
    return response.data;
  }

  // PUT actualizar usuario. Recibe nuevamente UserForm porque para editar utilizamos los datos del formulario.
  async updateUser(
    form: UserForm
  ): Promise<any> {


    // PUT se utiliza para actualizar la información de un usuario existente.
    const response = await axios.put(

      // Enviamos el ID como parámetro en la URL.
      `${this.apiUrl}?id=${form.id}`,

      // Nuevos datos del usuario.
      {
        username: form.username,
        email: form.email,
        name: form.name,
        password: form.password,
        status: form.status
      }
    );

    return response.data;
  }

  // PATCH Cambiar estado. Este método recibe un User
  async updateStatus(
    user: User
  ): Promise<any> {

    const newStatus: 'active' | 'inactive' =
      user.status === 'active'
        ? 'inactive'
        : 'active';

    const response = await axios.patch(

      `${this.apiUrl}?id=${user.id}`,

      // Solamente enviamos el dato que queremos cambiar.
      {
        status: newStatus
      }
    );

    return response.data;
  }
  
  async deleteUser(
    id: number
  ): Promise<any> {


    const response = await axios.delete(
      `${this.apiUrl}?id=${id}`
    );


    // Regresamos la respuesta enviada por PHP.
    return response.data;
  }
}