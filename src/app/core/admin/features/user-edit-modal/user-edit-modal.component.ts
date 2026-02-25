import { Component, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { UserEntity } from '../../../../models/user.model';
import { UsersService, UserUpdate } from '../../services/users.service';

@Component({
  selector: 'app-user-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-edit-modal.component.html',
  styleUrl: './user-edit-modal.component.scss',
})
export class UserEditModalComponent implements OnInit {
  public readonly user = input.required<UserEntity>();
  public readonly closed = output<void>();
  public readonly saved = output<UserEntity>();

  private readonly usersService = inject(UsersService);

  public isLoading = false;
  public errorMessage = '';

  public form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl(''),
    role: new FormControl<'admin' | 'user' | 'teacher'>('user', [Validators.required]),
  });

  public ngOnInit(): void {
    const u = this.user();
    this.form.patchValue({
      email: u.email,
      password: '',
      role: u.role,
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
    const updateData: UserUpdate = {
      email: formValue.email ?? undefined,
      role: (formValue.role as 'admin' | 'user' | 'teacher') ?? undefined,
    };

    if (formValue.password && formValue.password.trim() !== '') {
      updateData.password = formValue.password;
    }

    this.usersService.updateUser(this.user().id, updateData).subscribe({
      next: (updatedUser) => {
        this.isLoading = false;
        this.saved.emit(updatedUser);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при сохранении. Попробуйте снова.';
        console.error(err);
      },
    });
  }

  public onClose(): void {
    this.closed.emit();
  }
}
