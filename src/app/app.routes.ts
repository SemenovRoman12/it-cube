import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { teacherGuard } from './core/auth/guards/teacher-guard';
import { adminGuard } from './core/auth/guards/admin-guard';
import { studentGuard } from './core/auth/guards/student-guard';
import { roleRedirectGuard } from './core/auth/guards/role-redirect-guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleRedirectGuard],
    pathMatch: 'full',
    children: []
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'teacher',
    canActivate: [authGuard, teacherGuard],
    loadComponent: () => import('./pages/teacher/teacher.component').then(m => m.TeacherComponent)
  },
  {
    path: 'student',
    canActivate: [authGuard, studentGuard],
    loadComponent: () => import('./pages/student/student.component').then(m => m.StudentComponent)
  },
  { 
    path: 'login', 
    loadComponent: () => import('./core/auth/features/login/login.component').then(m => m.LoginComponent) 
  },
  {
    path: '**',
    redirectTo: ''
  }
];
