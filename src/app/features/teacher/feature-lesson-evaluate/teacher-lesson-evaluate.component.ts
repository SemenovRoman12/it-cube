import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../core/models/user.model';
import { JournalEntryEntity, MarkValue } from '../models/journal-entry.model';
import { LessonEntity } from '../models/lesson.model';
import { TeacherJournalApiService } from '../services/teacher-journal-api.service';

@Component({
  selector: 'teacher-lesson-evaluate',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './teacher-lesson-evaluate.component.html',
  styleUrl: './teacher-lesson-evaluate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonEvaluateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly journalApi = inject(TeacherJournalApiService);

  public readonly lesson = signal<LessonEntity | null>(null);
  public readonly student = signal<UserEntity | null>(null);
  public readonly submission = signal<LessonSubmissionEntity | null>(null);
  public readonly isLoading = signal(false);
  public readonly isSaving = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  public readonly markOptions: MarkValue[] = [1, 2, 3, 4, 5];

  public readonly form = this.formBuilder.group({
    mark: this.formBuilder.control<MarkValue | null>(null, Validators.required),
    teacher_comment: this.formBuilder.nonNullable.control(''),
  });

  public readonly answerText = computed(() => this.submission()?.answer_text || 'Ответ не отправлен');

  public ngOnInit(): void {
    this.loadData();
  }

  public onSave(): void {
    const lesson = this.lesson();
    const student = this.student();
    if (!lesson || !student || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const mark = this.form.controls.mark.value;
    if (mark == null) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.saveSubmission(lesson.id, student.id, mark, this.form.controls.teacher_comment.value.trim())
      .pipe(
        switchMap((savedSubmission) => this.upsertJournalEntry(lesson.id, student.id, mark, savedSubmission.teacher_comment)),
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось сохранить оценку.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.success.set('Оценка сохранена.');
      });
  }

  private loadData(): void {
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));

    if (!Number.isFinite(groupId) || !Number.isFinite(lessonId) || !Number.isFinite(studentId)) {
      this.error.set('Некорректные параметры страницы.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      lesson: this.journalApi.getLessonById(lessonId),
      students: this.journalApi.getStudentsByGroup(groupId),
      submission: this.journalApi.getLessonSubmission(lessonId, studentId),
      entries: this.journalApi.getJournalEntriesByLesson(lessonId),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.error.set('Не удалось загрузить данные оценивания.');
          return of({ lesson: null, students: [], submission: null, entries: [] as JournalEntryEntity[] });
        }),
      )
      .subscribe(({ lesson, students, submission, entries }) => {
        if (!lesson) {
          this.error.set('Урок не найден.');
          return;
        }

        const student = students.find((item) => item.id === studentId) ?? null;
        if (!student) {
          this.error.set('Ученик не найден в группе.');
          return;
        }

        const entry = entries.find((item) => item.student_id === studentId) ?? null;

        this.lesson.set(lesson);
        this.student.set(student);
        this.submission.set(submission);
        this.form.patchValue({
          mark: submission?.mark ?? entry?.mark ?? null,
          teacher_comment: submission?.teacher_comment ?? entry?.comment ?? '',
        });
      });
  }

  private saveSubmission(lessonId: number, studentId: number, mark: MarkValue, teacherComment: string) {
    return this.journalApi.getLessonSubmission(lessonId, studentId).pipe(
      switchMap((existing) => {
        if (existing) {
          return this.journalApi.updateLessonSubmission(existing.id, {
            mark,
            teacher_comment: teacherComment,
          });
        }

        return this.journalApi.createLessonSubmission({
          lesson_id: lessonId,
          student_id: studentId,
          answer_text: '',
          submitted_at: null,
          status: 'pending',
          teacher_comment: teacherComment,
          mark,
        });
      }),
      map((saved) => {
        this.submission.set(saved);
        return saved;
      }),
    );
  }

  private upsertJournalEntry(lessonId: number, studentId: number, mark: MarkValue, comment: string) {
    return this.journalApi.getJournalEntriesByLesson(lessonId).pipe(
      switchMap((entries) => {
        const existing = entries.find((item) => item.student_id === studentId);

        if (existing) {
          return this.journalApi.updateJournalEntry(existing.id, {
            mark,
            comment,
            attendance: existing.attendance,
          });
        }

        return this.journalApi.createJournalEntry({
          lesson_id: lessonId,
          student_id: studentId,
          mark,
          attendance: 'present',
          comment,
        });
      }),
    );
  }
}
