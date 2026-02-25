import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/services/auth.service';
import { TokenService } from './core/auth/services/token.service';
import { ApiService } from './core/http/api.service';
import { tap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  
  // public ngOnInit(): void {
  //   this.tokenService.getToken()
  //     ? this.authService.authMe().pipe(tap(() => this.router.navigateByUrl(''))).subscribe()
  //     : this.router.navigateByUrl('login');
    
  // }      
}
