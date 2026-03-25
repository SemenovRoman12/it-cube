export interface UserEntity {
  id: number;
  full_name: string;
  email: string;
  password?: string;
  avatar_url?: string | null;
  role: 'admin' | 'user' | 'teacher';
  group_id: number | null;
  created_at: string;
}
