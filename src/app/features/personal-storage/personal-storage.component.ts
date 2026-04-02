import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { PersonalFileEntity } from '../../core/models/personal-file.model';
import { UserEntity } from '../../core/models/user.model';
import { FileStorageService } from '../../core/services/file-storage.service';
import { PersonalStorageService } from '../../core/services/personal-storage.service';

@Component({
  selector: 'app-personal-storage',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './personal-storage.component.html',
  styleUrl: './personal-storage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalStorageComponent {
  private readonly authService = inject(AuthService);
  private readonly personalStorageService = inject(PersonalStorageService);
  private readonly fileStorageService = inject(FileStorageService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly currentUser = this.authService.user;
  public readonly files = signal<PersonalFileEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly isUploading = signal(false);
  public readonly deletingFileId = signal<number | null>(null);
  public readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  public readonly limitBytes = this.fileStorageService.personalStorageLimitBytes;

  public readonly usedBytes = computed(() => this.files().reduce((total, file) => total + file.size_bytes, 0));
  public readonly remainingBytes = computed(() => Math.max(this.limitBytes - this.usedBytes(), 0));
  public readonly usedPercent = computed(() => {
    if (!this.limitBytes) {
      return 0;
    }

    return Math.min(Math.round((this.usedBytes() / this.limitBytes) * 100), 100);
  });

  public ngOnInit(): void {
    this.loadFiles();
  }

  public loadFiles(): void {
    const user = this.currentUser();

    if (!user) {
      this.error.set('PERSONAL_STORAGE.ERROR_UNAUTHORIZED');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.personalStorageService.getUserFiles(user.id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.error.set('PERSONAL_STORAGE.ERROR_LOAD');
          this.files.set([]);
          return of([] as PersonalFileEntity[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((files) => this.files.set(files));
  }

  public onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);

    if (input) {
      input.value = '';
    }

    this.uploadFiles(files);
  }

  public downloadFile(file: PersonalFileEntity): void {
    window.open(file.file_url, '_blank', 'noopener');
  }

  public deleteFile(file: PersonalFileEntity): void {
    this.deletingFileId.set(file.id);
    this.error.set(null);
    this.success.set(null);

    this.personalStorageService.deleteUserFile(file)
      .pipe(
        finalize(() => this.deletingFileId.set(null)),
        catchError(() => {
          this.error.set('PERSONAL_STORAGE.ERROR_DELETE');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === null) {
          return;
        }

        this.files.update((items) => items.filter((item) => item.id !== file.id));
        this.success.set('PERSONAL_STORAGE.SUCCESS_DELETE');
      });
  }

  public formatBytes(value: number): string {
    if (value < 1024) {
      return `${value} B`;
    }

    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  public isDeleting(fileId: number): boolean {
    return this.deletingFileId() === fileId;
  }

  private uploadFiles(files: File[]): void {
    const user = this.currentUser();

    if (!user || !files.length) {
      return;
    }

    const validationError = this.fileStorageService.validateFiles(files);
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    const selectedFilesBytes = files.reduce((total, file) => total + file.size, 0);
    if (this.usedBytes() + selectedFilesBytes > this.limitBytes) {
      this.error.set('PERSONAL_STORAGE.ERROR_LIMIT_EXCEEDED');
      return;
    }

    this.isUploading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.personalStorageService.uploadUserFiles(user.id, files)
      .pipe(
        finalize(() => this.isUploading.set(false)),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'PERSONAL_STORAGE.ERROR_UPLOAD';
          this.error.set(message);
          return of([] as PersonalFileEntity[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((uploadedFiles) => {
        if (!uploadedFiles.length) {
          return;
        }

        this.files.update((items) => [...uploadedFiles, ...items].sort((first, second) => second.created_at.localeCompare(first.created_at)));
        this.success.set('PERSONAL_STORAGE.SUCCESS_UPLOAD');
      });
  }
}

