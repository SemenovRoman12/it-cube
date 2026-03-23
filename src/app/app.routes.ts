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
        loadComponent: () => import('./features/admin/admin-container/admin.component').then(m => m.AdminComponent),
        children: [
          {
            path: 'users',
            loadComponent: () => import('./features/admin/feature-users/admin-users/admin-users.component').then(m => m.AdminUsersComponent),
          },
          {
            path: 'groups',
            loadComponent: () => import('./features/admin/feature-groups/admin-groups/admin-groups.component').then(m => m.AdminGroupsComponent),
          },
          {
            path: 'groups/:id',
            loadComponent: () => import('./features/admin/feature-groups/admin-group-details/admin-group-details.component').then(m => m.AdminGroupDetailsComponent),
          },
        ]
      },
      {
        path: 'teacher',
        canActivate: [teacherGuard],
        loadComponent: () => import('./pages/teacher/teacher.component').then(m => m.TeacherComponent),
        children: [
          {
            path: 'groups',
            loadComponent: () => import('./features/teacher/feature-journal-groups/teacher-groups-list/teacher-groups-list.component').then(m => m.TeacherGroupsListComponent),
          },
          {
            path: 'journal/groups/:groupId',
            loadComponent: () => import('./features/teacher/feature-journal-lessons/teacher-lessons-list/teacher-lessons-list.component').then(m => m.TeacherLessonsListComponent),
          },
        ]
      },
      {
        path: 'student/subjects/:subjectId',
        canActivate: [studentGuard],
        loadComponent: () => import('./features/student/feature-subject-lessons/student-subject-lessons.component').then(m => m.StudentSubjectLessonsComponent),
      },
      {
        path: 'student',
        canActivate: [studentGuard],
        loadComponent: () => import('./features/student/feature-subjects/student-subjects-list/student-subjects-list.component').then(m => m.StudentSubjectsListComponent),
      },
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
