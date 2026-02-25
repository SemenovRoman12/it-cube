import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.getToken()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.user();
  if (!user || user.role !== 'admin') {
    router.navigate(['/']);
    return false;
  }

  return true;
};
