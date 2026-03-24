import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/services/auth.service';
import { TokenService } from './core/auth/services/token.service';
import { catchError, finalize, of } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { LanguageSwitchService } from './core/ui/services/language-switch.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatProgressSpinner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly languageSwitchService = inject(LanguageSwitchService);

  public readonly isAppLoading = signal(true);

  public ngOnInit(): void {
    this.languageSwitchService.init();

    if (!this.tokenService.getToken()) {
      this.router.navigateByUrl('login');
      this.isAppLoading.set(false);
      return;
    }

    this.authService
      .authMe()
      .pipe(
        catchError(() => {
          this.tokenService.removeToken();
          this.router.navigateByUrl('login');
          return of(null);
        }),
        finalize(() => this.isAppLoading.set(false)),
      )
      .subscribe();
  }
}
