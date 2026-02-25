import { UserEntity } from "../../../models/user.model";

export type UserToLogin = { email: string; password: string };

export type UserToRegister = Omit<UserEntity, 'id' | 'role'>;

export interface AuthResponse {
  token: string;
  data: UserEntity;
}
