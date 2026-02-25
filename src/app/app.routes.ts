import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { adminGuard } from './core/auth/guards/admin-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'login', 
    loadComponent: () => import('./core/auth/features/login/login.component').then(m => m.LoginComponent) 
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/admin-users/admin-users.component').then(m => m.AdminUsersComponent),
    // canActivate: [adminGuard]
  },
];
