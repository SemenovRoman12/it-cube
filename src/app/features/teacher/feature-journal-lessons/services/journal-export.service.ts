import { Injectable } from '@angular/core';
import { JournalGridVm } from '../../models/journal-table.model';
import * as XLSX from 'xlsx';

export interface JournalExportRequest {
  fileName: string;
  quarterLabel: string;
  subjectName: string;
  grid: JournalGridVm;
}

@Injectable({
  providedIn: 'root',
})
export class JournalExportService {
  public exportToExcel(request: JournalExportRequest): void {
    const lessons = request.grid.lessons;
    const rows = request.grid.rows;

    const header = ['Студент', ...lessons.map((lesson) => this.formatDate(lesson.date)), 'Средний балл'];

    const table = rows.map((row) => {
      const marks = row.cells
        .map((cell) => cell.mark)
        .filter((mark): mark is 1 | 2 | 3 | 4 | 5 => mark != null);

      const average = marks.length ? (marks.reduce((acc, value) => acc + value, 0) / marks.length).toFixed(2) : '';

      return [
        row.student.full_name,
        ...row.cells.map((cell) => {
          if (cell.attendance === 'absent' && cell.mark == null) {
            return 'Н';
          }

          return cell.mark ?? '';
        }),
        average,
      ];
    });

    const meta = [
      ['Предмет', request.subjectName],
      ['Четверть', request.quarterLabel],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([...meta, header, ...table]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Журнал');

    XLSX.writeFile(workbook, this.normalizeFileName(request.fileName));
  }

  private formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) {
      return isoDate;
    }

    return `${day}.${month}`;
  }

  private normalizeFileName(fileName: string): string {
    const trimmed = fileName.trim() || 'journal';
    const safe = trimmed.replace(/[\\/:*?"<>|]/g, '_');
    return safe.toLowerCase().endsWith('.xlsx') ? safe : `${safe}.xlsx`;
  }
}
