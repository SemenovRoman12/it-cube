export interface UserEntity {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'teacher';
}
