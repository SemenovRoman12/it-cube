export type LessonSubmissionStatus = 'pending' | 'submitted' | 'overdue';

export interface LessonSubmissionEntity {
  id: number;
  lesson_id: number;
  student_id: number;
  answer_text: string;
  submitted_at: string | null;
  status: LessonSubmissionStatus;
  teacher_comment: string;
  mark: 1 | 2 | 3 | 4 | 5 | null;
}

export type LessonSubmissionCreate = Omit<LessonSubmissionEntity, 'id'>;
export type LessonSubmissionUpdate = Partial<Omit<LessonSubmissionEntity, 'id' | 'lesson_id' | 'student_id'>>;
