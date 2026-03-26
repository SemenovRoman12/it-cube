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
import { TranslateModule } from '@ngx-translate/core';
import { SubjectEntity } from '../../../../core/models/subject.model';
import { SubjectCreate, SubjectsService } from '../../services/subjects.service';

type CreateSubjectForm = {
  name: string;
};

@Component({
  selector: 'app-subject-create-dialog',
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
    TranslateModule,
  ],
  templateUrl: './subject-create-dialog.component.html',
  styleUrl: './subject-create-dialog.component.scss',
})
export class SubjectCreateDialogComponent {
  public readonly dialogRef = inject(MatDialogRef<SubjectCreateDialogComponent>);
  private readonly subjectsService = inject(SubjectsService);

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

    const formValue = this.form.value as CreateSubjectForm;
    const createData: SubjectCreate = {
      name: formValue.name.trim(),
    };

    this.subjectsService.createSubject(createData).subscribe({
      next: (createdSubject: SubjectEntity) => {
        this.isLoading = false;
        this.dialogRef.close(createdSubject);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при создании предмета. Попробуйте снова.';
        console.error(err);
      },
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}

