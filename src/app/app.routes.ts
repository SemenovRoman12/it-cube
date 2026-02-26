import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { teacherGuard } from './core/auth/guards/teacher-guard';
import { adminGuard } from './core/auth/guards/admin-guard';
import { studentGuard } from './core/auth/guards/student-guard';
import { roleRedirectGuard } from './core/auth/guards/role-redirect-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./core/auth/features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [roleRedirectGuard],
        children: []
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
        children: []
      },
      {
        path: 'teacher',
        canActivate: [teacherGuard],
        loadComponent: () => import('./pages/teacher/teacher.component').then(m => m.TeacherComponent),
        children: []
      },
      {
        path: 'student',
        canActivate: [studentGuard],
        loadComponent: () => import('./pages/student/student.component').then(m => m.StudentComponent),
        children: []
      },
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
