import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupEntity } from '../../../../core/models/group.model';
import { GroupUpdate, GroupsService } from '../../services/groups.service';

type EditGroupForm = {
  name: string;
};

@Component({
  selector: 'app-group-edit-dialog',
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
  templateUrl: './group-edit-dialog.component.html',
  styleUrl: './group-edit-dialog.component.scss',
})
export class GroupEditDialogComponent implements OnInit {
  public readonly dialogRef = inject(MatDialogRef<GroupEditDialogComponent>);
  public readonly group: GroupEntity = inject(MAT_DIALOG_DATA);
  private readonly groupsService = inject(GroupsService);

  public isLoading = false;
  public errorMessage = '';

  public form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
  });

  public ngOnInit(): void {
    this.form.patchValue({
      name: this.group.name,
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.form.value as EditGroupForm;
    const updateData: GroupUpdate = {
      name: formValue.name.trim(),
    };

    this.groupsService.updateGroup(this.group.id, updateData).subscribe({
      next: (updatedGroup: GroupEntity) => {
        this.isLoading = false;
        this.dialogRef.close(updatedGroup);
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

