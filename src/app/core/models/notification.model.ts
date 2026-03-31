export type NotificationType =
  | 'mark_assigned'
  | 'submission_invited'
  | 'submission_invite_accepted'
  | 'submission_invite_declined'
  | 'submission_member_left'
  | 'submission_role_transferred';

export interface NotificationEntity {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  lesson_id: number | null;
  subject_id: number | null;
  group_id: number | null;
  teacher_id: number | null;
  student_id: number | null;
  submission_id: number | null;
  submission_member_id: number | null;
  mark: number | null;
  entity_kind: 'journal_entry' | 'lesson_submission' | 'lesson_submission_member' | null;
  entity_id: number | null;
  link: string | null;
}

export type NotificationCreate = Omit<NotificationEntity, 'id'>;
export type NotificationUpdate = Partial<Pick<NotificationEntity, 'is_read' | 'read_at'>>;

