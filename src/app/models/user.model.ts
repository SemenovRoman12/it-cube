export interface UserEntity {
  id: number;
  username: string;
  role: 'admin' | 'user' | 'teacher';
}
