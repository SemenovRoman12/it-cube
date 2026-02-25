import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../http/api.service';
import { TokenService } from './token.service';
import { UserEntity } from '../../../models/user.model';
import { UserToLogin } from '../models/auth.model';
import { UserToRegister } from '../models/auth.model';
import { catchError, Observable, of, tap } from 'rxjs';
import { AuthResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);

  private readonly _user = signal<UserEntity | null>(null);
  public readonly user = this._user.asReadonly();

  public readonly isAuthenticated = computed(() => !!this._user());

  public login(credentials: UserToLogin): Observable<AuthResponse | null> {
    console.log(credentials);
    return this.api.post<UserToLogin, AuthResponse>('auth', credentials).pipe(
      tap((response) => {
        this.tokenService.setToken(response.token);
        this._user.set(response.data);
      }),
      catchError((error: Error) => {
        console.error('Login failed', error);
        return of();
      })
    );
  }

  public register(userData: UserToRegister): Observable<AuthResponse | null> {
    return this.api.post<UserToRegister, AuthResponse>('register', userData).pipe(
      tap((response) => {
        this.tokenService.setToken(response.token);
        this._user.set(response.data);
      }),
      catchError((error: Error) => {
        console.error('Register failed', error);
        return of();
      })
    );
  }

  public authMe(): Observable<UserEntity> {
    return this.api.get<UserEntity>('auth_me').pipe(
      tap(user => this._user.set(user))
    )
  
  }

  public logout(): void {
    this.tokenService.removeToken();
    this._user.set(null);
  }
}
