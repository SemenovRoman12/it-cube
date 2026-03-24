import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef} from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of, catchError, finalize, filter } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GroupEntity } from '../../../../core/models/group.model';
import { GroupsService } from '../../../admin/services/groups.service';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';
import { TeacherGroupCardComponent } from '../teacher-group-card/teacher-group-card.component';
import { UserEntity } from '../../../../core/models/user.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'teacher-groups-list',
  imports: [TeacherGroupCardComponent, TranslateModule],
  templateUrl: './teacher-groups-list.component.html',
  styleUrl: './teacher-groups-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherGroupsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly groupsService = inject(GroupsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity;
  public readonly groups = signal<GroupEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

  public onOpenGroup(groupId: number): void {
    this.router.navigateByUrl(`/teacher/journal/groups/${groupId}`);
  }

  public ngOnInit(): void {
    this.loadGroups();
  }

  private loadGroups(): void {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(this.user.id),
      groups: this.groupsService.getGroups(),
    }).pipe(
      map(({ assignments, groups }) => {
        const allowedGroupIds = new Set(assignments.map((item) => item.group_id));
        const filteredGroups = groups.filter((group) => allowedGroupIds.has(group.id));
        return filteredGroups;
      }),
      catchError(() => {
        this.error.set('Ошибка загрузки групп учителя.');
        this.groups.set([]);
        return of([]);
      }),
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(filteredGroups => this.groups.set(filteredGroups));
  }

}
