import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {API_URL} from './core/http/api-url.token';
import {environment} from '../environments/environment.development';
import {provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS, withInterceptors} from '@angular/common/http';
import { Token } from '@angular/compiler';
import { tokenInterceptor } from './core/auth/services/token-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    {
      provide: API_URL,
      useValue: environment.api_url,
    }
  ]
};
