import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { UserToLogin } from '../../models/auth.model';
import { FormType } from '../../../models/form.type';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of, Subscription, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef)

  public isLoading = signal<boolean>(false);
  public hidePassword = true;
  public loginError = signal<string>('');

  public loginForm: FormGroup<FormType<UserToLogin>> = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  public onLogin(): void {
    if(this.loginForm.valid) {
      this.isLoading.set(true);
      this.loginError.set('');

      const credentials: UserToLogin = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!,
      }

      this.authService.login(credentials).pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: HttpErrorResponse) => {
          this.isLoading.set(false);
          if (error.status === 401) {
            this.loginError.set('COMMON.ERRORS.WRONG_CREDENTIALS');
          } else {
            this.loginError.set('COMMON.ERRORS.UNKNOWN');
          }
          return of(null);
        })
      ).subscribe((response) => {
        if (response && !(response instanceof HttpErrorResponse)) {
          this.isLoading.set(false);
          this.router.navigateByUrl('');
        }
      });
    }
  }
}

