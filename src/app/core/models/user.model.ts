export interface UserEntity {
  id: number;
  email: string;
  role: 'admin' | 'user' | 'teacher';
  group_id?: number | null;
}
