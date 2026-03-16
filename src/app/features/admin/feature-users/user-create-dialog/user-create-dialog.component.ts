import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { UserEntity } from '../../../../core/models/user.model';
import { UserCreate, UsersService } from '../../services/users.service';

type CreateUserForm = {
  email: string;
  password: string;
  role: 'admin' | 'user' | 'teacher';
};

@Component({
  selector: 'app-user-create-dialog',
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
  templateUrl: './user-create-dialog.component.html',
  styleUrl: './user-create-dialog.component.scss',
})
export class UserCreateDialogComponent {
  public readonly dialogRef = inject(MatDialogRef<UserCreateDialogComponent>);
  private readonly usersService = inject(UsersService);

  public isLoading = false;
  public errorMessage = '';
  public hidePassword = true;

  public form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    role: new FormControl<'admin' | 'user' | 'teacher'>('user', [Validators.required]),
  });

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.form.value as CreateUserForm;
    const createData: UserCreate = {
      email: formValue.email,
      password: formValue.password,
      role: formValue.role,
    };

    this.usersService.createUser(createData).subscribe({
      next: (createdUser: UserEntity) => {
        this.isLoading = false;
        this.dialogRef.close(createdUser);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при создании пользователя. Попробуйте снова.';
        console.error(err);
      },
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
