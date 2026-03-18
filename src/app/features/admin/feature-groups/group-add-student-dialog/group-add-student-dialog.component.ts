import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
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
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './group-add-student-dialog.component.html',
  styleUrl: './group-add-student-dialog.component.scss',
})
export class GroupAddStudentDialogComponent {
  private readonly usersService = inject(UsersService);
  public readonly dialogRef = inject(MatDialogRef<GroupAddStudentDialogComponent>);

  public selectedUserIds: number[] = [];
  public isLoading = false;
  public errorMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: DialogData) {}

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

