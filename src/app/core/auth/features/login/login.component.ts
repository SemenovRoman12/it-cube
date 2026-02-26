import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { catchError, of, throwError } from 'rxjs';

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
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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
        catchError((error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.loginError.set('Неверное имя пользователя или пароль');
          return throwError(() => error);
        })
      ).subscribe((response) => {
      console.log(response);
        if (response && !(response instanceof HttpErrorResponse)) {
          this.isLoading.set(false);
          this.router.navigateByUrl('');
        }
      });
    }
  }
}

