import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
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
export class TeacherSubjectLessonCreateComponent implements OnInit {
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
  public readonly existingFiles = signal<import('../../../../core/models/lesson-file.model').LessonFileEntity[]>([]);
  public readonly removedExistingFiles = signal<import('../../../../core/models/lesson-file.model').LessonFileEntity[]>([]);
  public readonly isDragOver = signal(false);
  public readonly today = new Date();

  public readonly groupId = Number(this.route.snapshot.paramMap.get('groupId'));
  public readonly subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
  public readonly lessonId = this.parseRouteNumber('lessonId');
  public readonly isEditMode = computed(() => this.lessonId !== null);

  public readonly form = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    description: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    due_date: this.formBuilder.control<Date | null>(null, Validators.required),
  });

  public ngOnInit(): void {
    const lessonId = this.lessonId;
    if (lessonId === null) {
      return;
    }

    this.isCreating.set(true);
    this.error.set(null);

    this.journalApi
      .getLessonById(lessonId)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (lesson) => {
          if (!lesson) {
            this.error.set('TEACHER.SUBJECTS_FEATURE.SUBMISSIONS_LESSON_NOT_FOUND');
            return;
          }

          this.form.patchValue({
            title: lesson.title ?? lesson.topic,
            description: lesson.description ?? '',
            due_date: lesson.due_at ? new Date(lesson.due_at) : null,
          });
        },
        error: () => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.EDIT_LOAD_ERROR');
        },
      });

    this.journalApi
      .getLessonFilesByLesson(lessonId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (files) => {
          this.existingFiles.set(files);
          this.removedExistingFiles.set([]);
        },
        error: () => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.EDIT_LOAD_ERROR');
        },
      });
  }

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

    if (!value.due_date) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.CREATE_DEADLINE_REQUIRED');
      return;
    }

    const invalidFile = this.fileStorage.validateFiles(this.selectedFiles());
    if (invalidFile) {
      this.error.set(invalidFile);
      return;
    }

    this.isCreating.set(true);
    this.error.set(null);

    if (this.isEditMode()) {
      const lessonId = this.lessonId;
      if (lessonId === null) {
        this.isCreating.set(false);
        this.error.set('TEACHER.SUBJECTS_FEATURE.CREATE_INVALID_PARAMS');
        return;
      }

      this.journalApi
        .updateLesson(lessonId, this.buildLessonUpdatePayload(value.title, value.description, value.due_date))
        .pipe(
          switchMap((updated) => this.syncEditedLessonFiles(updated.id, teacherId).pipe(switchMap(() => of(updated)))),
          finalize(() => this.isCreating.set(false)),
          catchError(() => {
            this.error.set('TEACHER.SUBJECTS_FEATURE.EDIT_ERROR');
            return of(null);
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((updated) => {
          if (updated) {
            this.router.navigate(this.backRoute);
          }
        });

      return;
    }

    this.journalApi
      .createLesson(this.buildLessonPayload(teacherId, value.title, value.description, value.due_date))
      .pipe(
        switchMap((created) => this.uploadLessonFilesOrRollback(created, teacherId)),
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
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  public onDropFiles(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  public removeSelectedFile(index: number): void {
    this.selectedFiles.set(this.selectedFiles().filter((_, currentIndex) => currentIndex !== index));
  }

  public removeExistingFile(fileId: number): void {
    const file = this.existingFiles().find((item) => item.id === fileId);
    if (!file) {
      return;
    }

    this.existingFiles.set(this.existingFiles().filter((item) => item.id !== fileId));
    this.removedExistingFiles.set([...this.removedExistingFiles(), file]);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseRouteNumber(paramName: string): number | null {
    const rawValue = this.route.snapshot.paramMap.get(paramName);
    if (rawValue == null) {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private buildLessonPayload(teacherId: number, title: string, description: string, dueDate: Date) {
    const nowIso = new Date().toISOString();
    const dueAt = new Date(dueDate);
    dueAt.setHours(23, 59, 0, 0);

    return {
      teacher_id: teacherId,
      group_id: this.groupId,
      subject_id: this.subjectId,
      date: this.toIsoDate(this.today),
      topic: title,
      lesson_type: 'assignment' as const,
      title,
      description,
      due_at: dueAt.toISOString(),
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  private buildLessonUpdatePayload(title: string, description: string, dueDate: Date) {
    const dueAt = new Date(dueDate);
    dueAt.setHours(23, 59, 0, 0);

    return {
      topic: title,
      title,
      description,
      due_at: dueAt.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private uploadLessonFilesOrRollback(createdLesson: { id: number }, teacherId: number) {
    const lessonId = createdLesson.id;
    const files = this.selectedFiles();
    if (!files.length) {
      return of(createdLesson);
    }

    return forkJoin(
      files.map((file) =>
        from(this.fileStorage.uploadAssignmentFile(lessonId, file)).pipe(
          switchMap((stored) =>
            this.journalApi.createLessonFile({
              lesson_id: lessonId,
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
      switchMap(() => of(createdLesson)),
      catchError((error) => this.rollbackLessonCreation(lessonId, error)),
    );
  }

  private syncEditedLessonFiles(lessonId: number, teacherId: number) {
    const deleteRequests = this.removedExistingFiles().map((file) => this.journalApi.removeLessonFile(file));
    const uploadRequests = this.selectedFiles().map((file) =>
      from(this.fileStorage.uploadAssignmentFile(lessonId, file)).pipe(
        switchMap((stored) =>
          this.journalApi.createLessonFile({
            lesson_id: lessonId,
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
    );

    const requests = [...deleteRequests, ...uploadRequests];
    if (!requests.length) {
      return of(null);
    }

    return forkJoin(requests).pipe(
      switchMap(() => of(null)),
    );
  }

  private rollbackLessonCreation(lessonId: number, originalError: unknown) {
    return this.journalApi.deleteLesson(lessonId).pipe(
      switchMap(() => throwError(() => originalError)),
      catchError(() => throwError(() => originalError)),
    );
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    this.selectedFiles.set([...this.selectedFiles(), ...files]);
  }
}
