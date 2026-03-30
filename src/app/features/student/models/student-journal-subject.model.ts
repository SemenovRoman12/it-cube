import { StudentJournalMarkVm } from './student-journal-mark.model';

export interface StudentJournalSubjectVm {
  subjectId: number;
  subjectName: string;
  marks: StudentJournalMarkVm[];
  averageMark: number | null;
  marksCount: number;
}
