export interface LessonEntity {
  id: number;
  teacher_id: number;
  group_id: number;
  subject_id: number;
  date: string;
  topic: string;
}

export type LessonCreate = Omit<LessonEntity, 'id'>;
export type LessonUpdate = Partial<Omit<LessonEntity, 'id' | 'teacher_id' | 'group_id' | 'subject_id'>>;

