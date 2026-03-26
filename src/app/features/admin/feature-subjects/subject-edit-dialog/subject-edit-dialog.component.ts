import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { SubjectEntity } from '../../../../core/models/subject.model';
import { SubjectUpdate, SubjectsService } from '../../services/subjects.service';

type EditSubjectForm = {
  name: string;
};

@Component({
  selector: 'app-subject-edit-dialog',
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
  templateUrl: './subject-edit-dialog.component.html',
  styleUrl: './subject-edit-dialog.component.scss',
})
export class SubjectEditDialogComponent implements OnInit {
  public readonly dialogRef = inject(MatDialogRef<SubjectEditDialogComponent>);
  public readonly subject: SubjectEntity = inject(MAT_DIALOG_DATA);
  private readonly subjectsService = inject(SubjectsService);

  public isLoading = false;
  public errorMessage = '';

  public form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
  });

  public ngOnInit(): void {
    this.form.patchValue({
      name: this.subject.name,
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.form.value as EditSubjectForm;
    const updateData: SubjectUpdate = {
      name: formValue.name.trim(),
    };

    this.subjectsService.updateSubject(this.subject.id, updateData).subscribe({
      next: (updatedSubject: SubjectEntity) => {
        this.isLoading = false;
        this.dialogRef.close(updatedSubject);
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

