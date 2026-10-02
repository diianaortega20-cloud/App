// User obtenemos desde la API
export interface User {

  // Identificador en la base de datos.
  id: number;

  username: string;

  email: string;

  // Nombre completo del usuario.
  name: string;

  status: 'active' | 'inactive';

  created_at?: string;

  updated_at?: string;
}

// UserForm representa los datos que utiliza el formulario
export interface UserForm {

  // number cuando estamos editando un usuario existente, null cuando estamos creando un usuario nuevo.
  id: number | null;

  username: string;

  email: string;

  name: string;

  password: string;

  status: 'active' | 'inactive';
}