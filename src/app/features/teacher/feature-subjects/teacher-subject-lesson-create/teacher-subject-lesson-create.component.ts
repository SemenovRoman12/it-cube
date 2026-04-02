import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, from, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { FileStorageService } from '../../../../core/services/file-storage.service';
import { TeacherJournalApiService } from '../../services/teacher-journal-api.service';

@Component({
  selector: 'teacher-subject-lesson-create',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './teacher-subject-lesson-create.component.html',
  styleUrl: './teacher-subject-lesson-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectLessonCreateComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly journalApi = inject(TeacherJournalApiService);
  private readonly fileStorage = inject(FileStorageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  public readonly isCreating = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly selectedFiles = signal<File[]>([]);
  public readonly today = new Date();

  public readonly groupId = Number(this.route.snapshot.paramMap.get('groupId'));
  public readonly subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));

  public readonly form = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    description: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    due_date: this.formBuilder.control<Date | null>(null, Validators.required),
  });

  public get backRoute(): string[] {
    return ['/teacher/subjects/groups', String(this.groupId), 'subjects', String(this.subjectId)];
  }

  public onCreateLesson(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const teacherId = this.authService.user()?.id;
    if (!teacherId || !Number.isFinite(this.subjectId) || !Number.isFinite(this.groupId)) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.CREATE_INVALID_PARAMS');
      return;
    }

    const value = this.form.getRawValue();
    const nowIso = new Date().toISOString();
    const lessonDate = this.toIsoDate(this.today);

    if (!value.due_date) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.CREATE_DEADLINE_REQUIRED');
      return;
    }

    const dueAt = new Date(value.due_date);
    dueAt.setHours(23, 59, 0, 0);

    const invalidFile = this.selectedFiles().map((file) => this.fileStorage.validateFile(file)).find((message) => !!message);
    if (invalidFile) {
      this.error.set(invalidFile);
      return;
    }

    this.isCreating.set(true);
    this.error.set(null);

    this.journalApi
      .createLesson({
        teacher_id: teacherId,
        group_id: this.groupId,
        subject_id: this.subjectId,
        date: lessonDate,
        topic: value.title,
        lesson_type: 'assignment',
        title: value.title,
        description: value.description,
        due_at: dueAt.toISOString(),
        created_at: nowIso,
        updated_at: nowIso,
      })
      .pipe(
        switchMap((created) => {
          const files = this.selectedFiles();
          if (!files.length) {
            return of(created);
          }

          return forkJoin(
            files.map((file) =>
              from(this.fileStorage.uploadAssignmentFile(created.id, file)).pipe(
                switchMap((stored) =>
                  this.journalApi.createLessonFile({
                    lesson_id: created.id,
                    submission_id: null,
                    owner_type: 'teacher_assignment',
                    uploaded_by_user_id: teacherId,
                    file_name: stored.fileName,
                    file_url: stored.fileUrl,
                    storage_path: stored.storagePath,
                    mime_type: stored.mimeType,
                    size_bytes: stored.sizeBytes,
                    created_at: new Date().toISOString(),
                  }),
                ),
              ),
            ),
          ).pipe(
            switchMap(() => of(created)),
            catchError((error) =>
              this.journalApi.deleteLesson(created.id).pipe(
                switchMap(() => throwError(() => error)),
                catchError(() => throwError(() => error)),
              ),
            ),
          );
        }),
        finalize(() => this.isCreating.set(false)),
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.CREATE_ERROR');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((created) => {
        if (created) {
          this.selectedFiles.set([]);
          this.router.navigate(this.backRoute);
        }
      });
  }

  public onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.selectedFiles.set(files);
  }

  public removeSelectedFile(index: number): void {
    this.selectedFiles.set(this.selectedFiles().filter((_, currentIndex) => currentIndex !== index));
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
