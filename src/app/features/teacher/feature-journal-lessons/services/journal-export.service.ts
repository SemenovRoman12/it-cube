import { Injectable } from '@angular/core';
import { JournalGridVm } from '../../models/journal-table.model';

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
  public exportToExcel(_request: JournalExportRequest): void {
    // TODO: Реализация выгрузки будет добавлена отдельно.
  }
}
