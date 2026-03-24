import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/http/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { UserEntity } from '../../core/models/user.model';

type UserProfileUpdate = Pick<UserEntity, 'full_name' | 'email'> & { password?: string };

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value?.trim() ?? '';
  const confirmPassword = control.get('confirmPassword')?.value?.trim() ?? '';

  if (!password && !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly currentUser = this.authService.user;

  public readonly isSaving = signal(false);
  public readonly editMode = signal(false);
  public readonly successMessage = signal('');
  public readonly errorMessage = signal('');
  public hidePassword = true;

  public readonly form = new FormGroup({
    full_name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true }),
  }, { validators: [passwordMatchValidator] });

  constructor() {
    this.resetFormFromUser();
  }

  public onStartEdit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.resetFormFromUser();
    this.editMode.set(true);
  }

  public onCancelEdit(): void {
    this.editMode.set(false);
    this.errorMessage.set('');
    this.resetFormFromUser();
  }

  public getRoleTranslationKey(role: UserEntity['role']): string {
    switch (role) {
      case 'admin':
        return 'COMMON.ROLES.ADMIN';
      case 'teacher':
        return 'COMMON.ROLES.TEACHER';
      default:
        return 'COMMON.ROLES.USER';
    }
  }

  public hasPasswordMismatch(): boolean {
    const confirmTouched = this.form.controls.confirmPassword.touched;
    const passwordTouched = this.form.controls.password.touched;
    return this.form.hasError('passwordMismatch') && (confirmTouched || passwordTouched);
  }

  private resetFormFromUser(): void {
    const user = this.authService.user();

    if (!user) {
      return;
    }

    this.form.patchValue({
      full_name: user.full_name,
      email: user.email,
      password: '',
      confirmPassword: '',
    });
  }

  public onSubmit(): void {
    const currentUser = this.authService.user();

    if (!currentUser) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const fullName = this.form.controls.full_name.value.trim();
    const email = this.form.controls.email.value.trim();
    const password = this.form.controls.password.value.trim();

    const payload: UserProfileUpdate = {
      full_name: fullName,
      email,
    };

    if (password) {
      payload.password = password;
    }

    this.api
      .patch<UserEntity>(`users/${currentUser.id}`, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedUser) => {
          this.authService.setUser(updatedUser);
          this.editMode.set(false);
          this.form.controls.password.setValue('');
          this.form.controls.confirmPassword.setValue('');
          this.successMessage.set('PROFILE.SUCCESS_SAVED');
          this.isSaving.set(false);
        },
        error: () => {
          this.errorMessage.set('PROFILE.ERROR_SAVE');
          this.isSaving.set(false);
        },
      });
  }
}
