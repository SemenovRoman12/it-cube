export interface UserEntity {
  id: number;
  email: string;
  role: 'admin' | 'user' | 'teacher';
}
