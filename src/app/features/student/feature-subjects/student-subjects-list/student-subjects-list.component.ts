import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserEntity } from '../../../../core/models/user.model';
import { StudentSubjectEntity } from '../../models/student-subject.model';
import { StudentSubjectsService } from '../../services/student-subjects.service';

@Component({
  selector: 'student-subjects-list',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './student-subjects-list.component.html',
  styleUrl: './student-subjects-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSubjectsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly studentSubjectsService = inject(StudentSubjectsService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity | null;
  public readonly subjects = signal<StudentSubjectEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.loadSubjects();
  }

  private loadSubjects(): void {
    if (!this.user?.group_id) {
      this.error.set('Пользователь не привязан к группе.');
      this.subjects.set([]);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.studentSubjectsService
      .getSubjectsByGroup(this.user.group_id)
      .pipe(
        catchError(() => {
          this.error.set('Не удалось загрузить предметы.');
          this.subjects.set([]);
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((subjects) => this.subjects.set(subjects));
  }
}

