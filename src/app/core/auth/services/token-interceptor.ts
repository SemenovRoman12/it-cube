import {HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import { TokenService } from './token.service';



const shouldIntercept = (req: HttpRequest<any>): boolean => {
  const shouldInterceptUrls = ['auth_me'];

  for (const url of shouldInterceptUrls) {
    
    if(req.url.includes(url)) {
      return true;
    }
  }

  return false
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  if(token && shouldIntercept(req)) {
    req = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        console.log('error');
      }
      return throwError(() => error);
    })
  );
};

