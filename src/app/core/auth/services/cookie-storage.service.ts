import { Injectable, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class CookieStorageService {
  private readonly cookieService = inject(CookieService);

  private readonly defaultPath = '/';
  private readonly defaultSameSite: 'Strict' = 'Strict';
  private readonly defaultSecure = true;
  private readonly defaultExpiresDays = 7;

  public get(key: string): string | null {
    const value = this.cookieService.get(key);
    return value || null;
  }

  public set(key: string, value: string): void {
    const expires = new Date(Date.now() + this.defaultExpiresDays * 24 * 60 * 60 * 1000);

    this.cookieService.set(
      key,
      value,
      expires,
      this.defaultPath,
      undefined,
      this.defaultSecure,
      this.defaultSameSite,
    );
  }

  public has(key: string): boolean {
    return this.cookieService.check(key);
  }

  public remove(key: string): void {
    this.cookieService.delete(key, this.defaultPath);
  }
}
