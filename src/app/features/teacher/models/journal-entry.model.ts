export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type MarkValue = 1 | 2 | 3 | 4 | 5;

export interface JournalEntryEntity {
  id: number;
  lesson_id: number;
  student_id: number;
  mark: MarkValue | null;
  attendance: AttendanceStatus;
  comment: string;
}

export type JournalEntryCreate = Omit<JournalEntryEntity, 'id'>;
export type JournalEntryUpdate = Partial<Omit<JournalEntryEntity, 'id' | 'lesson_id' | 'student_id'>>;

