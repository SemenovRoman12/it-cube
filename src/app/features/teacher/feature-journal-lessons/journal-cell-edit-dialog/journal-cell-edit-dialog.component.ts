import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AttendanceStatus, MarkValue } from '../../models/journal-entry.model';
import { JournalCellVm } from '../../models/journal-table.model';
import { TranslateModule } from '@ngx-translate/core';

export interface JournalCellEditDialogData {
  cell: JournalCellVm;
}

export interface JournalCellEditDialogResult {
  mark: MarkValue | null;
  attendance: AttendanceStatus;
  comment: string;
}

@Component({
  selector: 'teacher-journal-cell-edit-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './journal-cell-edit-dialog.component.html',
  styleUrl: './journal-cell-edit-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalCellEditDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<JournalCellEditDialogComponent, JournalCellEditDialogResult>);
  private readonly formBuilder = inject(FormBuilder);
  public readonly data = inject<JournalCellEditDialogData>(MAT_DIALOG_DATA);

  public readonly markOptions: MarkValue[] = [1, 2, 3, 4, 5];

  public readonly form = this.formBuilder.group({
    mark: this.formBuilder.control<MarkValue | null>(this.data.cell.mark),
    comment: this.formBuilder.nonNullable.control(this.data.cell.comment),
    isAbsent: this.formBuilder.nonNullable.control(this.data.cell.attendance === 'absent'),
  });

  public onSave(): void {
    const value = this.form.getRawValue();

    this.dialogRef.close({
      mark: value.mark,
      attendance: value.isAbsent ? 'absent' : 'present',
      comment: value.comment.trim(),
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
