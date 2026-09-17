export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface UserForm {
  id: number | null;
  username: string;
  email: string;
  name: string;
  password: string;
  status: 'active' | 'inactive';
}