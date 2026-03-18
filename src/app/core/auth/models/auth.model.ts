import { UserEntity } from "../../models/user.model";

export type UserToLogin = {
  email: string;
  password: string;
};

export type UserToRegister = {
  email: string;
  password: string;
  full_name: string;
  group_id: number | null;
};

export interface AuthResponse {
  token: string;
  data: UserEntity;
}
