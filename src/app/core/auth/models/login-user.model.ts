import {UserEntity} from '../../../models/user.model';

export type UserToLogin = Omit<UserEntity, 'id'>
