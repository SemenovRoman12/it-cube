import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { LoginComponent } from './core/auth/features/login/login.component';
import { App } from './app';
import { HomeComponent } from './layouts/home/home.component';

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
];
