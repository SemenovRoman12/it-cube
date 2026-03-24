import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {API_URL} from './core/http/api-url.token';
import {environment} from '../environments/environment.development';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient
} from '@angular/common/http';
import { tokenInterceptor } from './core/auth/services/token-interceptor';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core'
import {TranslateHttpLoader} from '@ngx-translate/http-loader';


export function HttpLoaderFactory (http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    {
      provide: API_URL,
      useValue: environment.api_url,
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
        defaultLanguage: 'ru'
      })
    ),
  ]
};
