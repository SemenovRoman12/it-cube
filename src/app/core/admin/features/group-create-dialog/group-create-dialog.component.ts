import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupEntity } from '../../../models/group.model';
import { GroupCreate, GroupsService } from '../../services/groups.service';

type CreateGroupForm = {
  name: string;
};

@Component({
  selector: 'app-group-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './group-create-dialog.component.html',
  styleUrl: './group-create-dialog.component.scss',
})
export class GroupCreateDialogComponent {
  public readonly dialogRef = inject(MatDialogRef<GroupCreateDialogComponent>);
  private readonly groupsService = inject(GroupsService);

  public isLoading = false;
  public errorMessage = '';

  public form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
  });

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.form.value as CreateGroupForm;
    const createData: GroupCreate = {
      name: formValue.name.trim(),
    };

    this.groupsService.createGroup(createData).subscribe({
      next: (createdGroup: GroupEntity) => {
        this.isLoading = false;
        this.dialogRef.close(createdGroup);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при создании группы. Попробуйте снова.';
        console.error(err);
      },
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}

