import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { API_URL } from '../../core/http/api-url.token';
import { AuthService } from '../../core/auth/services/auth.service';
import { UserEntity } from '../../core/models/user.model';

type UserProfileUpdate = Pick<UserEntity, 'full_name' | 'email'> & { password?: string };
interface UploadResponse {
  id: number;
  url: string;
}

const DEFAULT_AVATAR_STORAGE_KEY = 'defaultAvatarUrl';
const DEFAULT_AVATAR_MOKKY_URL = 'http://mokky.dev/uploaded/dfnhxiq6j/image/upload/v1774430966/file_pacrzh.jpg';
const AVATAR_UPLOAD_MAP_KEY = 'avatarUploadMap';

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
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly currentUser = this.authService.user;

  public readonly isSaving = signal(false);
  public readonly isAvatarSaving = signal(false);
  public readonly editMode = signal(false);
  public readonly successMessage = signal('');
  public readonly errorMessage = signal('');
  public readonly defaultAvatarUrl = signal<string>('');
  public hideNewPassword = true;
  public hideConfirmPassword = true;

  public readonly form = new FormGroup({
    full_name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true }),
  }, { validators: [passwordMatchValidator] });

  constructor() {
    this.restoreDefaultAvatarFromStorage();
    this.resetFormFromUser();
  }

  public getAvatarUrl(): string {
    const userAvatar = this.currentUser()?.avatar_url?.trim();
    const defaultAvatar = this.defaultAvatarUrl().trim();

    return userAvatar || defaultAvatar || DEFAULT_AVATAR_MOKKY_URL;
  }

  public onAvatarImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (!image) {
      return;
    }

    image.src = DEFAULT_AVATAR_MOKKY_URL;
  }

  public onAvatarFileSelected(event: Event): void {
    const currentUser = this.currentUser();
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!currentUser || !file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('PROFILE.ERROR_SAVE');
      if (input) {
        input.value = '';
      }
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isAvatarSaving.set(true);

    this.uploadFile(file)
      .pipe(
        switchMap((uploadResult) =>
          this.api
            .patch<UserEntity>(`users/${currentUser.id}`, { avatar_url: uploadResult.url })
            .pipe(map((updatedUser) => ({ updatedUser, uploadResult }))),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isAvatarSaving.set(false);
          if (input) {
            input.value = '';
          }
        }),
      )
      .subscribe({
        next: ({ updatedUser, uploadResult }) => {
          this.rememberAvatarUpload(uploadResult.url, uploadResult.id);
          this.authService.setUser(updatedUser);
          this.successMessage.set('PROFILE.SUCCESS_SAVED');
        },
        error: () => {
          this.errorMessage.set('PROFILE.ERROR_SAVE');
        },
      });
  }

  public onRemoveAvatar(): void {
    const currentUser = this.currentUser();
    const currentAvatarUrl = currentUser?.avatar_url?.trim() ?? '';
    const avatarUploadId = currentAvatarUrl === DEFAULT_AVATAR_MOKKY_URL ? null : this.getAvatarUploadId(currentAvatarUrl);

    if (!currentUser || this.isAvatarSaving()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isAvatarSaving.set(true);

    this.deleteAvatarFileIfPossible(avatarUploadId)
      .pipe(
        switchMap(() => this.api.patch<UserEntity>(`users/${currentUser.id}`, { avatar_url: null })),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isAvatarSaving.set(false)),
      )
      .subscribe({
        next: (updatedUser) => {
          this.forgetAvatarUpload(currentAvatarUrl);
          this.authService.setUser(updatedUser);
          this.successMessage.set('PROFILE.SUCCESS_SAVED');
        },
        error: () => {
          this.errorMessage.set('PROFILE.ERROR_SAVE');
        },
      });
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
    const confirmDirty = this.form.controls.confirmPassword.dirty;
    const passwordDirty = this.form.controls.password.dirty;

    return this.form.hasError('passwordMismatch') && (confirmTouched || passwordTouched || confirmDirty || passwordDirty);
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

  private restoreDefaultAvatarFromStorage(): void {
    const storedDefaultUrl = localStorage.getItem(DEFAULT_AVATAR_STORAGE_KEY);

    if (storedDefaultUrl?.trim() && storedDefaultUrl !== '/defaultProfilePic.jpg') {
      this.defaultAvatarUrl.set(storedDefaultUrl);
      return;
    }

    this.defaultAvatarUrl.set(DEFAULT_AVATAR_MOKKY_URL);
    localStorage.setItem(DEFAULT_AVATAR_STORAGE_KEY, DEFAULT_AVATAR_MOKKY_URL);
  }

  private uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.apiUrl}/uploads`, formData);
  }

  private deleteAvatarFileIfPossible(uploadId: number | null): Observable<unknown> {
    if (!uploadId) {
      return of(null);
    }

    return this.http.delete(`${this.apiUrl}/uploads/${uploadId}`);
  }

  private rememberAvatarUpload(url: string, id: number): void {
    const map = this.getAvatarUploadMap();
    map[url] = id;
    localStorage.setItem(AVATAR_UPLOAD_MAP_KEY, JSON.stringify(map));
  }

  private forgetAvatarUpload(url: string): void {
    if (!url) {
      return;
    }

    const map = this.getAvatarUploadMap();

    if (!(url in map)) {
      return;
    }

    delete map[url];
    localStorage.setItem(AVATAR_UPLOAD_MAP_KEY, JSON.stringify(map));
  }

  private getAvatarUploadId(url: string): number | null {
    if (!url) {
      return null;
    }

    const map = this.getAvatarUploadMap();
    return map[url] ?? null;
  }

  private getAvatarUploadMap(): Record<string, number> {
    const raw = localStorage.getItem(AVATAR_UPLOAD_MAP_KEY);

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return {};
    }
  }
}
