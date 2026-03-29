import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserEntity } from '../../../../core/models/user.model';
import { SubjectEntity } from '../../models/subject.model';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';

@Component({
  selector: 'teacher-subject-groups',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatProgressBarModule, TranslateModule],
  templateUrl: './teacher-subject-groups.component.html',
  styleUrl: './teacher-subject-groups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectGroupsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity;
  public readonly groupId = signal<number | null>(null);
  public readonly subjects = signal<SubjectEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly title = computed(() => {
    const id = this.groupId();
    return id == null ? 'Группа' : `Группа #${id}: выберите предмет`;
  });

  public ngOnInit(): void {
    this.loadSubjects();
  }

  public onOpenSubject(subjectId: number): void {
    const groupId = this.groupId();
    if (!groupId) {
      return;
    }

    this.router.navigateByUrl(`/teacher/subjects/groups/${groupId}/subjects/${subjectId}`);
  }

  private loadSubjects(): void {
    const routeGroupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!Number.isFinite(routeGroupId)) {
      this.error.set('Некорректная группа.');
      return;
    }

    this.groupId.set(routeGroupId);
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(this.user.id),
      subjects: this.assignmentsService.getSubjects(),
    })
      .pipe(
        map(({ assignments, subjects }) => {
          const subjectIds = new Set(
            assignments.filter((item) => item.group_id === routeGroupId).map((item) => item.subject_id),
          );

          return subjects.filter((subject) => subjectIds.has(subject.id));
        }),
        catchError(() => {
          this.error.set('Ошибка загрузки предметов по группе.');
          this.subjects.set([]);
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.subjects.set(items));
  }
}
