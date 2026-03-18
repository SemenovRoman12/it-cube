import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { UserEntity } from '../../../../core/models/user.model';
import { GroupEntity } from '../../../../core/models/group.model';
import { GroupsService } from '../../services/groups.service';
import { UsersService, UserUpdate } from '../../services/users.service';

@Component({
  selector: 'app-user-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './user-edit-dialog.component.html',
  styleUrl: './user-edit-dialog.component.scss',
})
export class UserEditDialogComponent implements OnInit {
  public readonly dialogRef = inject(MatDialogRef<UserEditDialogComponent>);
  public readonly user: UserEntity = inject(MAT_DIALOG_DATA);
  private readonly usersService = inject(UsersService);
  private readonly groupsService = inject(GroupsService);

  public isLoading = false;
  public isGroupsLoading = false;
  public errorMessage = '';
  public hidePassword = true;
  public groups: GroupEntity[] = [];

  public form = new FormGroup({
    full_name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl(''),
    group_id: new FormControl<number | null>(null),
    role: new FormControl<'admin' | 'user' | 'teacher'>('user', [Validators.required]),
  });

  public ngOnInit(): void {
    this.isGroupsLoading = true;

    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.isGroupsLoading = false;
      },
      error: (err: unknown) => {
        this.errorMessage = 'Не удалось загрузить список групп.';
        this.isGroupsLoading = false;
        console.error(err);
      },
    });

    this.form.patchValue({
      full_name: this.user.full_name,
      email: this.user.email,
      password: '',
      group_id: this.user.group_id,
      role: this.user.role,
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.form.value;
    const groupIdRaw = formValue.group_id;
    const groupId = groupIdRaw == null ? null : Number(groupIdRaw);

    const updateData: UserUpdate = {
      full_name: formValue.full_name?.trim() ?? undefined,
      email: formValue.email ?? undefined,
      group_id: Number.isNaN(groupId) ? null : groupId,
      role: (formValue.role as 'admin' | 'user' | 'teacher') ?? undefined,
    };

    if (formValue.password && formValue.password.trim() !== '') {
      updateData.password = formValue.password;
    }

    this.usersService.updateUser(this.user.id, updateData).subscribe({
      next: (updatedUser) => {
        this.isLoading = false;
        this.dialogRef.close(updatedUser);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при сохранении. Попробуйте снова.';
        console.error(err);
      },
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
