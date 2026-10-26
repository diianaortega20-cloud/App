/** Impide abrir las pestañas sin sesión local; los permisos efectivos los valida PHP. */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const sessionGuard: CanActivateFn = () => {
  const expiry = sessionStorage.getItem('auth_expires_at');
  return sessionStorage.getItem('auth_token') && expiry && Date.parse(expiry) > Date.now()
    ? true : inject(Router).parseUrl('/login');
};

export const administratorGuard: CanActivateFn = () => {
  let role = '';
  try { role = JSON.parse(localStorage.getItem('user') || 'null')?.role; } catch { /* Sin usuario válido. */ }
  return role === 'admin' ? true : inject(Router).parseUrl('/tabs/tab3');
};
