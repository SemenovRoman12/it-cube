import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { UserEntity } from '../../../../core/models/user.model';
import {
  GroupsService,
  SubjectEntity,
  TeacherGroupSubjectCreate,
  TeacherGroupSubjectEntity,
} from '../../services/groups.service';

type DialogData = {
  groupId: number;
  teachers: UserEntity[];
  subjects: SubjectEntity[];
  existingAssignments: TeacherGroupSubjectEntity[];
};

@Component({
  selector: 'app-group-add-teacher-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './group-add-teacher-dialog.component.html',
  styleUrl: './group-add-teacher-dialog.component.scss',
})
export class GroupAddTeacherDialogComponent {
  private readonly groupsService = inject(GroupsService);
  public readonly dialogRef = inject(MatDialogRef<GroupAddTeacherDialogComponent>);

  public selectedTeacherId: number | null = null;
  public selectedSubjectId: number | null = null;
  public isLoading = false;
  public errorMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: DialogData) {}

  public get teachers(): UserEntity[] {
    return this.data.teachers;
  }

  public get subjects(): SubjectEntity[] {
    return this.data.subjects;
  }

  public get canSubmit(): boolean {
    return !this.isLoading && this.selectedTeacherId != null && this.selectedSubjectId != null;
  }

  public trackById(_: number, item: UserEntity | SubjectEntity): number {
    return item.id;
  }

  public getTeacherLabel(teacher: UserEntity): string {
    return teacher.full_name?.trim() || teacher.email;
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit(): void {
    if (!this.canSubmit) {
      return;
    }

    const teacherId = Number(this.selectedTeacherId);
    const subjectId = Number(this.selectedSubjectId);

    const duplicate = this.data.existingAssignments.some(
      (assignment) => assignment.teacher_id === teacherId && assignment.subject_id === subjectId,
    );

    if (duplicate) {
      this.errorMessage = 'Такое назначение уже существует для этой группы.';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const payload: TeacherGroupSubjectCreate = {
      group_id: this.data.groupId,
      teacher_id: teacherId,
      subject_id: subjectId,
    };

    this.groupsService.createTeacherAssignment(payload).subscribe({
      next: (assignment) => {
        this.isLoading = false;
        this.dialogRef.close(assignment);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при добавлении учителя в группу.';
        console.error(err);
      },
    });
  }
}

