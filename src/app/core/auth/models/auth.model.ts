import { UserEntity } from "../../../models/user.model";

export type UserToLogin = Omit<UserEntity, 'id' | 'role'> & { password: string };

export type UserToRegister = Omit<UserEntity, 'id' | 'role'> & { password: string };

export interface AuthResponse {
  token: string;
  data: UserEntity;
}
