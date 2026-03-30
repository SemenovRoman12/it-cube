import { AttendanceStatus, MarkValue } from '../../teacher/models/journal-entry.model';

export interface StudentJournalMarkVm {
  lessonId: number;
  lessonDate: string;
  lessonTopic: string;
  mark: MarkValue | null;
  attendance: AttendanceStatus;
  comment: string;
}
