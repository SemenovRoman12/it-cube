export type LessonFileOwnerType = 'teacher_assignment' | 'student_submission';

export interface LessonFileEntity {
  id: number;
  lesson_id: number;
  submission_id: number | null;
  owner_type: LessonFileOwnerType;
  uploaded_by_user_id: number;
  file_name: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export type LessonFileCreate = Omit<LessonFileEntity, 'id'>;
export type LessonFileUpdate = Partial<Omit<LessonFileEntity, 'id' | 'lesson_id' | 'submission_id' | 'owner_type'>>;
