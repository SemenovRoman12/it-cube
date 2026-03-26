import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth-guard';
import { teacherGuard } from './core/auth/guards/teacher-guard';
import { adminGuard } from './core/auth/guards/admin-guard';
import { studentGuard } from './core/auth/guards/student-guard';
import { roleRedirectGuard } from './core/auth/guards/role-redirect-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./layouts/unauth-layout/unauth-layout.component').then(c => c.UnauthLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./core/auth/features/login/login.component').then(c => c.LoginComponent)
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(c => c.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [roleRedirectGuard],
        children: []
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(c => c.ProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin-container/admin.component').then(c => c.AdminComponent),
        children: [
          {
            path: 'users',
            loadComponent: () => import('./features/admin/feature-users/admin-users/admin-users.component').then(c => c.AdminUsersComponent),
          },
          {
            path: 'groups',
            loadComponent: () => import('./features/admin/feature-groups/admin-groups/admin-groups.component').then(c => c.AdminGroupsComponent),
          },
          {
            path: 'subjects',
            loadComponent: () => import('./features/admin/feature-subjects/admin-subjects/admin-subjects.component').then(m => m.AdminSubjectsComponent),
          },
          {
            path: 'groups/:id',
            loadComponent: () => import('./features/admin/feature-groups/admin-group-details/admin-group-details.component').then(c => c.AdminGroupDetailsComponent),
          },
        ]
      },
      {
        path: 'teacher',
        canActivate: [teacherGuard],
        loadComponent: () => import('./pages/teacher/teacher.component').then(c => c.TeacherComponent),
        children: [
          {
            path: 'groups',
            loadComponent: () => import('./features/teacher/feature-journal-groups/teacher-groups-list/teacher-groups-list.component').then(c => c.TeacherGroupsListComponent),
          },
          {
            path: 'journal/groups/:groupId',
            loadComponent: () => import('./features/teacher/feature-journal-lessons/teacher-lessons-list/teacher-lessons-list.component').then(c => c.TeacherLessonsListComponent),
          },
        ]
      },
      {
        path: 'student/subjects/:subjectId',
        canActivate: [studentGuard],
        loadComponent: () => import('./features/student/feature-subject-lessons/student-subject-lessons.component').then(c => c.StudentSubjectLessonsComponent),
      },
      {
        path: 'student',
        canActivate: [studentGuard],
        loadComponent: () => import('./features/student/feature-subjects/student-subjects-list/student-subjects-list.component').then(c => c.StudentSubjectsListComponent),
      },
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
