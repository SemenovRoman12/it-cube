import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.user()?.role;

  switch (role) {
    case 'admin':
      router.navigate(['/admin']);
      return false;
    case 'teacher':
      router.navigate(['/teacher']);
      return false;
    case 'user':
      router.navigate(['/student']);
      return false;
    default:
      router.navigate(['/login']);
      return false;
  }
};
