import { Injectable, signal } from '@angular/core';


@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly token: string = 'token';

  public getToken(): string | null {
    return localStorage.getItem(this.token) || null;
  }

  public setToken(value: string) {
    localStorage.setItem(this.token, value);
  }

  public removeToken(){
    localStorage.removeItem(this.token);
  }
}
