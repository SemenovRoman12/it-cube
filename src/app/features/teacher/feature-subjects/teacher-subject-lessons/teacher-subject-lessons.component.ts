import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { LessonSubmissionEntity } from '../../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../../core/models/user.model';
import { LessonEntity } from '../../models/lesson.model';
import { TeacherJournalApiService } from '../../services/teacher-journal-api.service';

@Component({
  selector: 'teacher-subject-lessons',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './teacher-subject-lessons.component.html',
  styleUrl: './teacher-subject-lessons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectLessonsComponent implements OnInit {
  public readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journalApi = inject(TeacherJournalApiService);

  public readonly lessons = signal<LessonEntity[]>([]);
  public readonly students = signal<UserEntity[]>([]);
  public readonly submissions = signal<LessonSubmissionEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly lessonRows = computed(() =>
    this.lessons()
      .map((lesson) => {
        const lessonSubmissions = this.submissions().filter((item) => item.lesson_id === lesson.id);

        const submittedCount = lessonSubmissions.filter((item) => item.status === 'submitted').length;
        const overdueCount = lessonSubmissions.filter((item) => item.status === 'overdue').length;
        const pendingCount = Math.max(this.students().length - lessonSubmissions.length, 0);

        return {
          lesson,
          submittedCount,
          overdueCount,
          pendingCount,
        };
      })
      .sort((first, second) => second.lesson.date.localeCompare(first.lesson.date)),
  );

  public ngOnInit(): void {
    this.loadData();
  }

  public openSubmissions(lessonId: number): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!Number.isFinite(subjectId) || !Number.isFinite(groupId)) {
      return;
    }

    this.router.navigate([
      '/teacher/subjects/groups',
      groupId,
      'subjects',
      subjectId,
      'lessons',
      lessonId,
      'submissions',
    ]);
  }

  public goToCreateLesson(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!Number.isFinite(subjectId) || !Number.isFinite(groupId)) {
      return;
    }

    this.router.navigate(['/teacher/subjects/groups', groupId, 'subjects', subjectId, 'lessons', 'create']);
  }

  private loadData(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!Number.isFinite(subjectId) || !Number.isFinite(groupId)) {
      this.error.set('Некорректные параметры страницы.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      students: this.journalApi.getStudentsByGroup(groupId),
      lessons: this.journalApi.getLessonsByGroupAndSubject(groupId, subjectId),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.error.set('Не удалось загрузить уроки по предмету.');
          return of({ students: [], lessons: [] as LessonEntity[] });
        }),
      )
      .subscribe(({ students, lessons }) => {
        this.students.set(students);
        this.lessons.set(lessons);

        if (!lessons.length) {
          this.submissions.set([]);
          return;
        }

        forkJoin(lessons.map((lesson) => this.journalApi.getLessonSubmissionsByLesson(lesson.id)))
          .pipe(catchError(() => of([] as LessonSubmissionEntity[][])))
          .subscribe((chunks) => this.submissions.set(chunks.flat()));
      });
  }
}
