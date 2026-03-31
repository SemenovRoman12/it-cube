export type LessonSubmissionMemberRole = 'creator' | 'member';

export type LessonSubmissionMemberStatus = 'invited' | 'accepted' | 'declined' | 'left';

export interface LessonSubmissionMemberEntity {
  id: number;
  submission_id: number;
  lesson_id: number;
  student_id: number;
  role: LessonSubmissionMemberRole;
  status: LessonSubmissionMemberStatus;
  invited_by_student_id: number;
  invited_at: string;
  responded_at: string | null;
  left_at: string | null;
}

export type LessonSubmissionMemberCreate = Omit<LessonSubmissionMemberEntity, 'id'>;
export type LessonSubmissionMemberUpdate = Partial<Omit<LessonSubmissionMemberEntity, 'id' | 'submission_id' | 'lesson_id' | 'student_id'>>;
