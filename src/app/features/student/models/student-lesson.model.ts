export interface StudentLessonEntity {
  id: number;
  teacher_id: number;
  group_id: number;
  subject_id: number;
  date: string;
  topic: string;
  lesson_type?: 'assignment';
  title?: string;
  description?: string;
  due_at?: string;
}

