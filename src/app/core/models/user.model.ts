export interface UserEntity {
  id: number;
  full_name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user' | 'teacher';
  group_id: number | null;
  created_at: string;
}
