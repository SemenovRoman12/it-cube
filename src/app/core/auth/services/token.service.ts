import { Injectable, inject } from '@angular/core';
import { CookieStorageService } from './cookie-storage.service';


@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly cookieStorageService = inject(CookieStorageService);
  private readonly token: string = 'token';

  public getToken(): string | null {
    return this.cookieStorageService.get(this.token);
  }

  public setToken(value: string): void {
    this.cookieStorageService.set(this.token, value);
  }

  public removeToken(): void {
    this.cookieStorageService.remove(this.token);
  }
}
