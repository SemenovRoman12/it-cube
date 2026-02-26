import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.user()?.role;

  switch (role) {
    case 'admin':
      return router.navigate(['/admin']);
    case 'teacher':
      return router.navigate(['/teacher']);
    case 'user':
      return router.navigate(['/student']);
    default:
      return router.navigate(['/login']);
  }
};
