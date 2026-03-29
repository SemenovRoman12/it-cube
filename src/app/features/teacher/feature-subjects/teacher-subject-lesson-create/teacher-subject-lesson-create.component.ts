import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TeacherJournalApiService } from '../../services/teacher-journal-api.service';

@Component({
  selector: 'teacher-subject-lesson-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    DatePipe,
  ],
  templateUrl: './teacher-subject-lesson-create.component.html',
  styleUrl: './teacher-subject-lesson-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectLessonCreateComponent {
  public readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly journalApi = inject(TeacherJournalApiService);
  private readonly formBuilder = inject(FormBuilder);

  public readonly isCreating = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly today = new Date();

  public readonly form = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    description: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    due_date: this.formBuilder.control<Date | null>(null, Validators.required),
  });

  public onCreateLesson(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const teacherId = this.authService.user()?.id;
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!teacherId || !Number.isFinite(subjectId) || !Number.isFinite(groupId)) {
      this.error.set('Некорректные параметры создания урока.');
      return;
    }

    const value = this.form.getRawValue();
    const nowIso = new Date().toISOString();
    const lessonDate = this.toIsoDate(this.today);
    const dueDate = value.due_date;

    if (!dueDate) {
      this.error.set('Выберите дедлайн.');
      return;
    }

    const dueAt = new Date(dueDate);
    dueAt.setHours(23, 59, 0, 0);
    const dueAtIso = dueAt.toISOString();

    this.isCreating.set(true);
    this.error.set(null);

    this.journalApi
      .createLesson({
        teacher_id: teacherId,
        group_id: groupId,
        subject_id: subjectId,
        date: lessonDate,
        topic: value.title,
        lesson_type: 'assignment',
        title: value.title,
        description: value.description,
        due_at: dueAtIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .pipe(
        finalize(() => this.isCreating.set(false)),
        catchError(() => {
          this.error.set('Не удалось создать урок.');
          return of(null);
        }),
      )
      .subscribe((created) => {
        if (!created) {
          return;
        }

        this.router.navigate(['/teacher/subjects/groups', groupId, 'subjects', subjectId]);
      });
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
