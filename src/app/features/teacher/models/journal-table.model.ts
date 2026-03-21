import { JournalEntryEntity, MarkValue, AttendanceStatus } from './journal-entry.model';
import { LessonEntity } from './lesson.model';
import { UserEntity } from '../../../core/models/user.model';

export interface JournalCellVm {
  lessonId: number;
  studentId: number;
  entryId: number | null;
  mark: MarkValue | null;
  attendance: AttendanceStatus;
  comment: string;
  isDirty: boolean;
}

export interface JournalRowVm {
  student: UserEntity;
  cells: JournalCellVm[];
}

export interface JournalGridVm {
  lessons: LessonEntity[];
  rows: JournalRowVm[];
}

export interface JournalEntryKey {
  lessonId: number;
  studentId: number;
}

export type JournalEntryMap = Map<string, JournalEntryEntity>;

