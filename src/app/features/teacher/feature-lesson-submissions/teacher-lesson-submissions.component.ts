import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { UserEntity } from '../../../core/models/user.model';
import { LessonEntity } from '../models/lesson.model';
import { TeacherJournalApiService } from '../services/teacher-journal-api.service';

@Component({
  selector: 'teacher-lesson-submissions',
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatProgressBarModule, TranslateModule],
  templateUrl: './teacher-lesson-submissions.component.html',
  styleUrl: './teacher-lesson-submissions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonSubmissionsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journalApi = inject(TeacherJournalApiService);

  public readonly lesson = signal<LessonEntity | null>(null);
  public readonly students = signal<UserEntity[]>([]);
  public readonly submissionsByStudentId = signal<Record<number, LessonSubmissionEntity | null>>({});
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly rows = computed(() =>
    this.students().map((student) => {
      const submission = this.submissionsByStudentId()[student.id] ?? null;
      const dueAt = this.lesson()?.due_at;
      const status = submission?.status ?? (dueAt && new Date(dueAt).getTime() < Date.now() ? 'overdue' : 'pending');

      return {
        student,
        submission,
        status,
      };
    }),
  );

  public ngOnInit(): void {
    this.loadData();
  }

  public openEvaluate(studentId: number): void {
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));

    if (!Number.isFinite(groupId) || !Number.isFinite(lessonId) || !Number.isFinite(subjectId)) {
      return;
    }

    this.router.navigate([
      '/teacher/subjects/groups',
      groupId,
      'subjects',
      subjectId,
      'lessons',
      lessonId,
      'students',
      studentId,
      'evaluate',
    ]);
  }

  private loadData(): void {
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    if (!Number.isFinite(groupId) || !Number.isFinite(lessonId)) {
      this.error.set('Некорректные параметры страницы.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      lesson: this.journalApi.getLessonById(lessonId),
      students: this.journalApi.getStudentsByGroup(groupId),
      submissions: this.journalApi.getLessonSubmissionsByLesson(lessonId),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.error.set('Не удалось загрузить список на проверку.');
          return of({ lesson: null, students: [], submissions: [] as LessonSubmissionEntity[] });
        }),
      )
      .subscribe(({ lesson, students, submissions }) => {
        if (!lesson) {
          this.error.set('Урок не найден.');
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
