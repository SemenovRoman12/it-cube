import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { CellClickedEvent, ColDef, ValueFormatterParams } from 'ag-grid-community';
import { MarkValue } from '../../models/journal-entry.model';
import { JournalCellVm, JournalRowVm } from '../../models/journal-table.model';
import { LessonEntity } from '../../models/lesson.model';

interface JournalTableRowData {
  studentName: string;
  averageMark: number | null;
  [key: string]: unknown;
}

@Component({
  selector: 'teacher-journal-table',
  imports: [CommonModule, AgGridAngular],
  templateUrl: './journal-table.component.html',
  styleUrl: './journal-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalTableComponent {
  public readonly lessons = input<LessonEntity[]>([]);
  public readonly rows = input<JournalRowVm[]>([]);
  public readonly cellEdit = output<JournalCellVm>();

  public readonly columnDefs = computed<ColDef[]>(() => {
    const lessonColumns: ColDef[] = this.lessons().map((lesson) => ({
      headerName: this.formatHeaderDate(lesson.date),
      field: this.lessonField(lesson.id),
      width: 80,
      minWidth: 80,
      maxWidth: 80,
      resizable: false,
      suppressMovable: true,
      sortable: false,
      suppressSizeToFit: true,
      cellClass: (params) => this.getLessonCellClass(params.value as JournalCellVm | null),
      valueFormatter: (params) => this.formatLessonCell(params),
    }));

    return [
      {
        headerName: 'Студент',
        field: 'studentName',
        pinned: 'left',
        minWidth: 260,
        suppressMovable: true,
      },
      ...lessonColumns,
      {
        headerName: 'Средний балл',
        field: 'averageMark',
        pinned: 'right',
        minWidth: 130,
        suppressMovable: true,
        valueFormatter: (params) => (typeof params.value === 'number' ? params.value.toFixed(2) : '—'),
      },
    ];
  });

  public readonly rowData = computed<JournalTableRowData[]>(() =>
    this.rows().map((row) => {
      const marks = row.cells
        .map((cell) => cell.mark)
        .filter((mark): mark is MarkValue => mark != null && Number.isInteger(mark));

      const averageMark = marks.length ? marks.reduce((acc, current) => acc + current, 0) / marks.length : null;
      const lessonCellsMap = row.cells.reduce<Record<string, JournalCellVm>>((acc, cell) => {
        acc[this.lessonField(cell.lessonId)] = cell;
        return acc;
      }, {});

      return {
        studentName: row.student.full_name,
        averageMark,
        ...lessonCellsMap,
      };
    }),
  );

  public onCellClicked(event: CellClickedEvent<JournalTableRowData>): void {
    if (!event.colDef.field?.startsWith('lesson_')) {
      return;
    }

    const cell = event.value as JournalCellVm | undefined;
    if (cell) {
      this.cellEdit.emit(cell);
    }
  }

  private formatHeaderDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) {
      return isoDate;
    }

    return `${day}.${month}`;
  }

  private formatLessonCell(params: ValueFormatterParams<JournalCellVm>): string {
    const cell = params.value;
    if (!cell) {
      return '—';
    }

    const isAbsent = cell.attendance === 'absent';
    const hasMark = cell.mark != null;

    if (isAbsent && hasMark) {
      return `Н/${cell.mark}`;
    }

    if (isAbsent) {
      return 'Н';
    }

    if (hasMark) {
      return String(cell.mark);
    }

    return '—';
  }

  private getLessonCellClass(cell: JournalCellVm | null): string[] {
    return [
      'journal-table__lesson-cell',
      cell?.isDirty ? 'journal-table__lesson-cell--dirty' : '',
      cell?.attendance === 'absent' ? 'journal-table__lesson-cell--absent' : '',
    ].filter(Boolean);
  }

  private lessonField(lessonId: number): string {
    return `lesson_${lessonId}`;
  }
}
