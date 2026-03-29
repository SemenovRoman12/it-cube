import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of, catchError, finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GroupEntity } from '../../../../core/models/group.model';
import { UserEntity } from '../../../../core/models/user.model';
import { GroupsService } from '../../../admin/services/groups.service';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';
import { TeacherGroupCardComponent } from '../../feature-journal-groups/teacher-group-card/teacher-group-card.component';

@Component({
  selector: 'groups-list',
  imports: [TeacherGroupCardComponent, MatIconModule, MatButtonModule, MatProgressBarModule, TranslateModule],
  templateUrl: './groups-list.component.html',
  styleUrl: './groups-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly groupsService = inject(GroupsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly titleKey = input('TEACHER.ATTENDANCE.GROUPS.TITLE');
  public readonly icon = input('analytics');
  public readonly emptyKey = input('TEACHER.ATTENDANCE.GROUPS.EMPTY');
  public readonly errorKey = input('TEACHER.ATTENDANCE.GROUPS.ERROR');
  public readonly navigatePrefix = input('/teacher/attendance/groups');

  public readonly user = this.authService.user() as UserEntity;
  public readonly groups = signal<GroupEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.loadGroups();
  }

  public onOpenGroup(groupId: number): void {
    this.router.navigateByUrl(`${this.navigatePrefix()}/${groupId}`);
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
          this.error.set(this.errorKey());
          return of([]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.groups.set(items));
  }
}

