import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserEntity } from '../../../../core/models/user.model';
import { GroupEntity } from '../../../../core/models/group.model';
import { SubjectEntity } from '../../models/subject.model';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';
import { GroupsService } from '../../../admin/services/groups.service';

@Component({
  selector: 'teacher-subject-groups',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule],
  templateUrl: './teacher-subject-groups.component.html',
  styleUrl: './teacher-subject-groups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectGroupsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly groupsService = inject(GroupsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity;
  public readonly group = signal<GroupEntity | null>(null);
  public readonly subjects = signal<SubjectEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly groupName = computed(() => this.group()?.name ?? '...');

  public ngOnInit(): void {
    this.loadSubjects();
  }

  public onOpenSubject(subjectId: number): void {
    const groupId = this.group()?.id;
    if (!groupId) {
      return;
    }
    this.router.navigateByUrl(`/teacher/subjects/groups/${groupId}/subjects/${subjectId}`);
  }

  private loadSubjects(): void {
    const routeGroupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!Number.isFinite(routeGroupId)) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.SUBJECTS_ERROR');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(this.user.id),
      subjects: this.assignmentsService.getSubjects(),
      groups: this.groupsService.getGroups(),
    })
      .pipe(
        map(({ assignments, subjects, groups }) => {
          const currentGroup = groups.find((g) => g.id === routeGroupId) ?? null;
          const subjectIds = new Set(
            assignments.filter((item) => item.group_id === routeGroupId).map((item) => item.subject_id),
          );
          return {
            group: currentGroup,
            subjects: subjects.filter((subject) => subjectIds.has(subject.id)),
          };
        }),
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.SUBJECTS_ERROR');
          return of({ group: null, subjects: [] as SubjectEntity[] });
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ group, subjects }) => {
        this.group.set(group);
        this.subjects.set(subjects);
      });
  }
}
