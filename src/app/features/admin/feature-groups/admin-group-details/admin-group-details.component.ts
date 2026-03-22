import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GroupAddStudentDialogComponent } from '../group-add-student-dialog/group-add-student-dialog.component';
import { GroupsService } from '../../services/groups.service';
import { UsersService } from '../../services/users.service';
import { GroupEntity } from '../../../../core/models/group.model';
import { UserEntity } from '../../../../core/models/user.model';

@Component({
  selector: 'app-admin-container-group-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-group-details.component.html',
  styleUrl: './admin-group-details.component.scss',
})
export class AdminGroupDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly groupsService = inject(GroupsService);
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);

  public readonly isLoading = signal(false);
  public readonly errorMessage = signal('');
  public readonly group = signal<GroupEntity | null>(null);
  public readonly students = signal<UserEntity[]>([]);
  public readonly removingStudentId = signal<number | null>(null);
  public readonly groupName = computed(() => this.group()?.name ?? 'Группа');
  public readonly studentCount = computed(() => this.students().length);
  public readonly hasStudents = computed(() => this.studentCount() > 0);

  private groupId = 0;

  public ngOnInit(): void {
    this.groupId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

    if (!this.groupId || Number.isNaN(this.groupId)) {
      this.errorMessage.set('Некорректный идентификатор группы.');
      return;
    }

    this.loadData();
  }

  public loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      group: this.groupsService.getGroupById(this.groupId),
      students: this.usersService.getUsersByFilters({
        role: 'user',
        group_id: this.groupId,
      }),
    }).subscribe({
      next: ({ group, students }) => {
        this.group.set(group);
        this.students.set(students);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.errorMessage.set('Ошибка при загрузке группы.');
        this.group.set(null);
        this.students.set([]);
        this.isLoading.set(false);
        console.error(err);
      },
    });
  }

  public openAddStudentDialog(): void {
    const dialogRef = this.dialog.open(GroupAddStudentDialogComponent, {
      width: '460px',
      data: {
        groupId: this.groupId,
      },
    });

    dialogRef.afterClosed().subscribe((updatedUsers: UserEntity[] | undefined) => {
      if (!updatedUsers?.length) {
        return;
      }

      this.loadData();
    });
  }

  public removeStudent(student: UserEntity): void {
    const confirmed = window.confirm(`Удалить ученика ${student.email} из группы?`);
    if (!confirmed) {
      return;
    }

    this.removingStudentId.set(student.id);

    this.usersService.removeUserFromGroup(student.id).subscribe({
      next: () => {
        this.students.set(this.students().filter((u) => u.id !== student.id));
        this.removingStudentId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении ученика из группы.');
        this.removingStudentId.set(null);
        console.error(err);
      },
    });
  }

  public getStudentDisplayName(student: UserEntity): string {
    const fullName = student.full_name?.trim();
    return fullName || student.email;
  }

  public getStudentInitials(student: UserEntity): string {
    const fullName = student.full_name?.trim();
    if (!fullName) {
      return student.email.slice(0, 2).toUpperCase();
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  public getStudentNameParts(student: UserEntity): { surname: string; name: string; middleName: string } {
    const fullName = student.full_name?.trim();
    if (!fullName) {
      return {
        surname: '—',
        name: '—',
        middleName: '—',
      };
    }

    const [surname = '—', name = '—', ...middle] = fullName.split(/\s+/).filter(Boolean);

    return {
      surname,
      name,
      middleName: middle.join(' ') || '—',
    };
  }

  public formatCreatedAt(value: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
}

