import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const tokentService = inject(TokenService);
  const router = inject(Router);

  if (!tokentService.getToken()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
