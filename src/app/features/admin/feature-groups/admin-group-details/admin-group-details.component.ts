import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GroupAddStudentDialogComponent } from '../group-add-student-dialog/group-add-student-dialog.component';
import { GroupsService } from '../../services/groups.service';
import { UsersService } from '../../services/users.service';
import { GroupEntity } from '../../../../core/models/group.model';
import { UserEntity } from '../../../../core/models/user.model';

@Component({
  selector: 'app-admin-container-group-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
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

  private groupId = 0;

  public ngOnInit(): void {
    this.groupId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
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
}

