import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../core/models/user.model';
import { StudentLessonEntity } from '../models/student-lesson.model';
import { StudentSubjectsService } from '../services/student-subjects.service';

@Component({
  selector: 'student-lesson-details',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    TranslateModule,
    DatePipe,
  ],
  templateUrl: './student-lesson-details.component.html',
  styleUrl: './student-lesson-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLessonDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly studentSubjectsService = inject(StudentSubjectsService);
  private readonly formBuilder = inject(FormBuilder);

  public readonly user = this.authService.user() as UserEntity | null;
  public readonly lesson = signal<StudentLessonEntity | null>(null);
  public readonly submission = signal<LessonSubmissionEntity | null>(null);
  public readonly isLoading = signal(false);
  public readonly isSaving = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);

  public readonly form = this.formBuilder.group({
    answer_text: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
  });

  public readonly status = computed(() => {
    const submission = this.submission();
    if (submission?.status === 'submitted') {
      return 'submitted';
    }

    if (submission?.status === 'overdue') {
      return 'overdue';
    }

    const dueAt = this.lesson()?.due_at;
    if (!dueAt) {
      return 'pending';
    }

    return new Date(dueAt).getTime() < Date.now() ? 'overdue' : 'pending';
  });

  public getLessonTitle(lesson: StudentLessonEntity): string {
    return (lesson as StudentLessonEntity & { title?: string }).title || lesson.topic;
  }

  public getLessonDescription(lesson: StudentLessonEntity): string {
    return (lesson as StudentLessonEntity & { description?: string }).description || lesson.topic;
  }

  public getLessonDueAt(lesson: StudentLessonEntity): string | null {
    return (lesson as StudentLessonEntity & { due_at?: string }).due_at ?? null;
  }

  public ngOnInit(): void {
    this.loadData();
  }

  public onSubmit(): void {
    const lesson = this.lesson();
    const student = this.user;
    if (!lesson || !student) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dueAt = lesson.due_at;
    const nowIso = new Date().toISOString();
    const status = dueAt && new Date(dueAt).getTime() < Date.now() ? 'overdue' : 'submitted';

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.studentSubjectsService
      .upsertStudentSubmission(lesson.id, student.id, {
        answer_text: this.form.controls.answer_text.value.trim(),
        submitted_at: nowIso,
        status,
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось отправить ответ.');
          return of(null);
        }),
      )
      .subscribe((saved) => {
        if (!saved) {
          return;
        }

        this.submission.set(saved);
        this.success.set('Ответ сохранён.');
      });
  }

  private loadData(): void {
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    const student = this.user;

    if (!Number.isFinite(lessonId) || !student) {
      this.error.set('Некорректные параметры страницы.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      lesson: this.studentSubjectsService.getLessonById(lessonId),
      submission: this.studentSubjectsService.getStudentSubmission(lessonId, student.id),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.error.set('Не удалось загрузить данные задания.');
          return of({ lesson: null, submission: null });
        }),
      )
      .subscribe(({ lesson, submission }) => {
        if (!lesson) {
          this.error.set('Задание не найдено.');
          return;
        }

        this.lesson.set(lesson);
        this.submission.set(submission);
        this.form.patchValue({ answer_text: submission?.answer_text ?? '' });
      });
  }
}
