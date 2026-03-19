import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { UserEntity } from '../../../../core/models/user.model';
import { UsersService } from '../../services/users.service';

type DialogData = {
  groupId: number;
  users: UserEntity[];
};

@Component({
  selector: 'app-group-add-student-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './group-add-student-dialog.component.html',
  styleUrl: './group-add-student-dialog.component.scss',
})
export class GroupAddStudentDialogComponent {
  private readonly usersService = inject(UsersService);
  public readonly dialogRef = inject(MatDialogRef<GroupAddStudentDialogComponent>);

  public selectedUserIds: number[] = [];
  public searchQuery = '';
  public showOnlyWithoutGroup = false;
  public showOnlySelected = false;
  public isLoading = false;
  public errorMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: DialogData) {}

  public get filteredUsers(): UserEntity[] {
    const normalizedSearch = this.searchQuery.trim().toLowerCase();

    return this.data.users.filter((user) => {
      if (this.showOnlyWithoutGroup && user.group_id !== null) {
        return false;
      }

      const isSelected = this.selectedUserIds.includes(user.id);
      if (this.showOnlySelected && !isSelected) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }

  public toggleUserSelection(userId: number): void {
    if (this.isLoading) {
      return;
    }

    const selectedIndex = this.selectedUserIds.indexOf(userId);
    if (selectedIndex >= 0) {
      this.selectedUserIds = this.selectedUserIds.filter((id) => id !== userId);
      return;
    }

    this.selectedUserIds = [...this.selectedUserIds, userId];
  }

  public isUserSelected(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }

  public clearSearch(): void {
    this.searchQuery = '';
  }

  public onSubmit(): void {
    if (!this.selectedUserIds.length) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const requests = this.selectedUserIds.map((userId) => this.usersService.assignUserToGroup(userId, this.data.groupId));

    forkJoin(requests).subscribe({
      next: (updatedUsers) => {
        this.isLoading = false;
        this.dialogRef.close(updatedUsers);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при добавлении учеников в группу.';
        console.error(err);
      },
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}

