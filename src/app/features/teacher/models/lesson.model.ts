export interface LessonEntity {
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
  created_at?: string;
  updated_at?: string;
}

export type LessonCreate = Omit<LessonEntity, 'id'>;
export type LessonUpdate = Partial<Omit<LessonEntity, 'id' | 'teacher_id' | 'group_id' | 'subject_id'>>;

