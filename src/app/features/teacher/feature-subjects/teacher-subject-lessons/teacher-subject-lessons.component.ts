import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { LessonSubmissionEntity } from '../../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../../core/ui/components/confirm-dialog/confirm-dialog.component';
import { LessonEntity } from '../../models/lesson.model';
import { TeacherJournalApiService } from '../../services/teacher-journal-api.service';

interface LessonRowVm {
  lesson: LessonEntity;
  submittedCount: number;
  overdueCount: number;
  pendingCount: number;
  isDeleting: boolean;
}

@Component({
  selector: 'teacher-subject-lessons',
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    TranslateModule,
  ],
  templateUrl: './teacher-subject-lessons.component.html',
  styleUrl: './teacher-subject-lessons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectLessonsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly journalApi = inject(TeacherJournalApiService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly lessons = signal<LessonEntity[]>([]);
  public readonly students = signal<UserEntity[]>([]);
  public readonly submissions = signal<LessonSubmissionEntity[]>([]);
  public readonly deletingLessonIds = signal<number[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly groupId = Number(this.route.snapshot.paramMap.get('groupId'));
  public readonly subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));

  public readonly lessonRows = computed<LessonRowVm[]>(() =>
    this.lessons()
      .map((lesson) => {
        const lessonSubmissions = this.submissions().filter((item) => item.lesson_id === lesson.id);
        const submittedCount = lessonSubmissions.filter((item) => item.status === 'submitted').length;
        const overdueCount = lessonSubmissions.filter((item) => item.status === 'overdue').length;
        const pendingCount = Math.max(this.students().length - lessonSubmissions.length, 0);
        const isDeleting = this.deletingLessonIds().includes(lesson.id);

        return { lesson, submittedCount, overdueCount, pendingCount, isDeleting };
      })
      .sort((a, b) => b.lesson.date.localeCompare(a.lesson.date)),
  );

  public ngOnInit(): void {
    this.loadData();
  }

  public openSubmissions(lessonId: number): void {
    this.router.navigate([
      '/teacher/subjects/groups', this.groupId,
      'subjects', this.subjectId,
      'lessons', lessonId, 'submissions',
    ]);
  }

  public goToCreateLesson(): void {
    this.router.navigate([
      '/teacher/subjects/groups', this.groupId,
      'subjects', this.subjectId,
      'lessons', 'create',
    ]);
  }

  public onEditLesson(lessonId: number): void {
    this.router.navigate([
      '/teacher/subjects/groups', this.groupId,
      'subjects', this.subjectId,
      'lessons', lessonId, 'edit',
    ]);
  }

  public onDeleteLesson(lesson: LessonEntity): void {
    if (this.deletingLessonIds().includes(lesson.id)) {
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Удалить задание?',
          message: 'Будут удалены само задание, прикреплённые файлы и все ответы учеников.',
          confirmText: 'Удалить',
          cancelText: 'Отмена',
          variant: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.deletingLessonIds.set([...this.deletingLessonIds(), lesson.id]);
        this.error.set(null);

        this.journalApi
          .deleteAssignmentWithRelations(lesson.id)
          .pipe(
            finalize(() => {
              this.deletingLessonIds.set(this.deletingLessonIds().filter((id) => id !== lesson.id));
            }),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe({
            next: () => {
              this.lessons.set(this.lessons().filter((item) => item.id !== lesson.id));
              this.submissions.set(this.submissions().filter((item) => item.lesson_id !== lesson.id));
            },
            error: () => {
              this.error.set('TEACHER.SUBJECTS_FEATURE.DELETE_ERROR');
            },
          });
      });
  }

  private loadData(): void {
    if (!Number.isFinite(this.subjectId) || !Number.isFinite(this.groupId)) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.LESSONS_INVALID_PARAMS');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      students: this.journalApi.getStudentsByGroup(this.groupId),
      lessons: this.journalApi.getLessonsByGroupAndSubject(this.groupId, this.subjectId),
    })
      .pipe(
        switchMap(({ students, lessons }) => {
          this.students.set(students);
          this.lessons.set(lessons);

          if (!lessons.length) {
            return of([] as LessonSubmissionEntity[][]);
          }

          return forkJoin(
            lessons.map((lesson) =>
              this.journalApi.getLessonSubmissionsByLesson(lesson.id).pipe(catchError(() => of([]))),
            ),
          );
        }),
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.LESSONS_ERROR');
          return of([] as LessonSubmissionEntity[][]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((chunks) => this.submissions.set(chunks.flat()));
  }
}
