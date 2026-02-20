import {UserEntity} from '../../../models/user.model';

export type UserToRegister = Omit<UserEntity, 'id'>
