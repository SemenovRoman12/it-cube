import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/auth/services/auth.service';
import { AttendanceStatus, MarkValue } from '../models/journal-entry.model';
import { TeacherJournalService } from '../services/teacher-journal.service';

@Component({
  selector: 'teacher-journal-feature',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './teacher-journal.component.html',
  styleUrl: './teacher-journal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherJournalComponent {
  private readonly authService = inject(AuthService);
  private readonly journalService = inject(TeacherJournalService);
  private readonly formBuilder = inject(FormBuilder);

  public readonly attendanceOptions: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
  public readonly markOptions: Array<MarkValue | null> = [null, 1, 2, 3, 4, 5];

  public readonly lessonForm = this.formBuilder.nonNullable.group({
    topic: ['', [Validators.required, Validators.maxLength(120)]],
    date: ['', Validators.required],
  });

  public readonly groups = this.journalService.groups;
  public readonly subjects = this.journalService.subjects;
  public readonly grid = this.journalService.journalGrid;
  public readonly isLoading = this.journalService.isLoading;
  public readonly isSaving = this.journalService.isSaving;
  public readonly error = this.journalService.error;
  public readonly selectedGroupId = this.journalService.selectedGroupId;
  public readonly selectedSubjectId = this.journalService.selectedSubjectId;
  public readonly hasDirtyChanges = this.journalService.hasDirtyChanges;

  public constructor() {
    const teacherId = this.authService.user()?.id;
    if (teacherId != null) {
      this.journalService.initialize(teacherId).subscribe();
    }
  }

  public onGroupChange(groupId: number): void {
    this.journalService.selectGroup(groupId).subscribe();
  }

  public onSubjectChange(subjectId: number): void {
    this.journalService.selectSubject(subjectId).subscribe();
  }

  public onCreateLesson(): void {
    if (!this.lessonForm.valid) {
      this.lessonForm.markAllAsTouched();
      return;
    }

    const value = this.lessonForm.getRawValue();
    this.journalService.createLesson(value.topic.trim(), value.date).subscribe((created) => {
      if (created) {
        this.lessonForm.patchValue({ topic: '' });
      }
    });
  }

  public canCreateLesson(): boolean {
    return this.selectedGroupId() != null && this.selectedSubjectId() != null && this.lessonForm.valid;
  }

  public onMarkChange(lessonId: number, studentId: number, value: MarkValue | null): void {
    const mark = this.isMarkValue(value) ? value : null;
    this.journalService.updateCellDraft(lessonId, studentId, { mark });
  }

  public onAttendanceChange(lessonId: number, studentId: number, attendance: AttendanceStatus): void {
    this.journalService.updateCellDraft(lessonId, studentId, { attendance });
  }

  public onCommentChange(lessonId: number, studentId: number, comment: string): void {
    this.journalService.updateCellDraft(lessonId, studentId, { comment: comment.trim() });
  }

  public onSaveChanges(): void {
    this.journalService.saveChanges().subscribe();
  }

  public onResetChanges(): void {
    this.journalService.resetLocalChanges();
  }

  public getAttendanceLabel(value: AttendanceStatus): string {
    switch (value) {
      case 'present':
        return 'Присутствовал';
      case 'absent':
        return 'Отсутствовал';
      case 'late':
        return 'Опоздал';
      case 'excused':
        return 'Уважительная причина';
      default:
        return value;
    }
  }

  private isMarkValue(value: number | null): value is MarkValue {
    return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
  }
}

