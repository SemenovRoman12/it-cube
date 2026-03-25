import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { UserEntity } from '../../../core/models/user.model';
import { StudentLessonEntity } from '../models/student-lesson.model';
import { StudentSubjectsService } from '../services/student-subjects.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'student-subject-lessons',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTableModule, TranslateModule],
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
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly displayedColumns = ['date', 'topic'];

  public readonly subjectName = computed(() => this.route.snapshot.queryParamMap.get('name') ?? 'Предмет');

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
        catchError(() => {
          this.error.set('Не удалось загрузить уроки предмета.');
          this.lessons.set([]);
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lessons) => this.lessons.set(lessons));
  }
}

