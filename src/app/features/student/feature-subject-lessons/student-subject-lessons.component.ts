import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../core/models/user.model';
import { StudentLessonEntity } from '../models/student-lesson.model';
import { StudentSubjectsService } from '../services/student-subjects.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'student-subject-lessons',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTableModule, TranslateModule, DatePipe],
  templateUrl: './student-subject-lessons.component.html',
  styleUrl: './student-subject-lessons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSubjectLessonsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly studentSubjectsService = inject(StudentSubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity | null;
  public readonly lessons = signal<StudentLessonEntity[]>([]);
  public readonly submissionsByLessonId = signal<Record<number, LessonSubmissionEntity | null>>({});
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly displayedColumns = ['date', 'title', 'due', 'status', 'action'];

  public readonly subjectName = computed(() => this.route.snapshot.queryParamMap.get('name') ?? 'Предмет');
  public readonly progress = computed(() => {
    const lessons = this.lessons();

    if (!lessons.length) {
      return {
        total: 0,
        submitted: 0,
        overdue: 0,
        pending: 0,
        completionPercent: 0,
        submittedPercent: 0,
        overduePercent: 0,
        pendingPercent: 0,
      };
    }

    const stats = lessons.reduce(
      (acc, lesson) => {
        const status = this.getLessonStatus(lesson);

        acc[status] += 1;
        return acc;
      },
      {
        submitted: 0,
        overdue: 0,
        pending: 0,
      } as Record<'submitted' | 'overdue' | 'pending', number>,
    );

    return {
      total: lessons.length,
      submitted: stats.submitted,
      overdue: stats.overdue,
      pending: stats.pending,
      completionPercent: Math.round((stats.submitted / lessons.length) * 100),
      submittedPercent: (stats.submitted / lessons.length) * 100,
      overduePercent: (stats.overdue / lessons.length) * 100,
      pendingPercent: (stats.pending / lessons.length) * 100,
    };
  });

  public ngOnInit(): void {
    this.loadLessons();
  }

  private loadLessons(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    if (!Number.isFinite(subjectId)) {
      this.error.set('Некорректный предмет.');
      this.lessons.set([]);
      return;
    }

    if (!this.user?.group_id) {
      this.error.set('Пользователь не привязан к группе.');
      this.lessons.set([]);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.studentSubjectsService
      .getLessonsByGroupAndSubject(this.user.group_id, subjectId)
      .pipe(
        switchMap((lessons) => {
          const sorted = [...lessons];
          this.lessons.set(sorted);

          return this.studentSubjectsService
            .getStudentSubmissionMap(
              sorted.map((lesson) => lesson.id),
              this.user!.id,
            )
            .pipe(
              catchError(() => of({})),
              switchMap((submissionMap) => of({ lessons: sorted, submissionMap })),
            );
        }),
        catchError(() => {
          this.error.set('Не удалось загрузить уроки предмета.');
          this.lessons.set([]);
          this.submissionsByLessonId.set({});
          return of({ lessons: [], submissionMap: {} as Record<number, LessonSubmissionEntity | null> });
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ lessons, submissionMap }) => {
        this.lessons.set(lessons);
        this.submissionsByLessonId.set(submissionMap);
      });
  }

  public getLessonTitle(lesson: StudentLessonEntity): string {
    return lesson.title?.trim() || lesson.topic;
  }

  public getLessonStatus(lesson: StudentLessonEntity): 'submitted' | 'pending' | 'overdue' {
    const submission = this.submissionsByLessonId()[lesson.id];
    if (submission?.status === 'submitted') {
      return 'submitted';
    }

    if (submission?.status === 'overdue') {
      return 'overdue';
    }

    if (!lesson.due_at) {
      return 'pending';
    }

    return new Date(lesson.due_at).getTime() < Date.now() ? 'overdue' : 'pending';
  }
}

