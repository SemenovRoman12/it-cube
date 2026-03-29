import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../core/models/user.model';
import { LessonEntity } from '../models/lesson.model';
import { TeacherJournalApiService } from '../services/teacher-journal-api.service';

@Component({
  selector: 'teacher-lesson-submissions',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule],
  templateUrl: './teacher-lesson-submissions.component.html',
  styleUrl: './teacher-lesson-submissions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonSubmissionsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journalApi = inject(TeacherJournalApiService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly lesson = signal<LessonEntity | null>(null);
  public readonly students = signal<UserEntity[]>([]);
  public readonly submissionsByStudentId = signal<Record<number, LessonSubmissionEntity | null>>({});
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly groupId = Number(this.route.snapshot.paramMap.get('groupId'));
  public readonly subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
  public readonly lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));

  public readonly rows = computed(() =>
    this.students().map((student) => {
      const submission = this.submissionsByStudentId()[student.id] ?? null;
      const dueAt = this.lesson()?.due_at;
      const status = submission?.status ?? (dueAt && new Date(dueAt).getTime() < Date.now() ? 'overdue' : 'pending');

      return { student, submission, status };
    }),
  );

  public ngOnInit(): void {
    this.loadData();
  }

  public openEvaluate(studentId: number): void {
    this.router.navigate([
      '/teacher/subjects/groups', this.groupId,
      'subjects', this.subjectId,
      'lessons', this.lessonId,
      'students', studentId, 'evaluate',
    ]);
  }

  private loadData(): void {
    if (!Number.isFinite(this.groupId) || !Number.isFinite(this.lessonId)) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.LESSONS_INVALID_PARAMS');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      lesson: this.journalApi.getLessonById(this.lessonId),
      students: this.journalApi.getStudentsByGroup(this.groupId),
      submissions: this.journalApi.getLessonSubmissionsByLesson(this.lessonId),
    })
      .pipe(
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.SUBMISSIONS_ERROR');
          return of({ lesson: null, students: [], submissions: [] as LessonSubmissionEntity[] });
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ lesson, students, submissions }) => {
        if (!lesson) {
          this.error.set('TEACHER.SUBJECTS_FEATURE.SUBMISSIONS_LESSON_NOT_FOUND');
          return;
        }

        this.lesson.set(lesson);
        this.students.set(students);
        this.submissionsByStudentId.set(
          submissions.reduce<Record<number, LessonSubmissionEntity>>((acc, item) => {
            acc[item.student_id] = item;
            return acc;
          }, {}),
        );
      });
  }
}
