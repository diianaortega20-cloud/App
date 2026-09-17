import { Injectable } from '@angular/core';
import axios from 'axios';

import {
  User,
  UserForm
} from '../models/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly apiUrl =
    'http://localhost/api_9b/users.php';

  async getUsers(): Promise<User[]> {

    const response =
      await axios.get(this.apiUrl);

    if (response.data.success) {
      return response.data.users;
    }

    return [];
  }

  async createUser(
    form: UserForm
  ): Promise<any> {

    const response = await axios.post(
      this.apiUrl,
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

  async updateUser(
    form: UserForm
  ): Promise<any> {

    const response = await axios.put(
      `${this.apiUrl}?id=${form.id}`,
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

  async updateStatus(
    user: User
  ): Promise<any> {

    const newStatus: 'active' | 'inactive' =
      user.status === 'active'
        ? 'inactive'
        : 'active';

    const response = await axios.patch(
      `${this.apiUrl}?id=${user.id}`,
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

    return response.data;
  }
}