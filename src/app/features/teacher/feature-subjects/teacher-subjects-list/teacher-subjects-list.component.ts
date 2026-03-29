import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GroupEntity } from '../../../../core/models/group.model';
import { UserEntity } from '../../../../core/models/user.model';
import { GroupsService } from '../../../admin/services/groups.service';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';

@Component({
  selector: 'teacher-subjects-list',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule],
  templateUrl: './teacher-subjects-list.component.html',
  styleUrl: './teacher-subjects-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly groupsService = inject(GroupsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity;
  public readonly groups = signal<GroupEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.loadGroups();
  }

  public onOpenGroup(groupId: number): void {
    this.router.navigateByUrl(`/teacher/subjects/groups/${groupId}`);
  }

  public loadGroups(): void {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(this.user.id),
      groups: this.groupsService.getGroups(),
    })
      .pipe(
        map(({ assignments, groups }) => {
          const allowedGroupIds = new Set(assignments.map((item) => item.group_id));
          return groups.filter((group) => allowedGroupIds.has(group.id));
        }),
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.GROUPS_ERROR');
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.groups.set(items));
  }
}
