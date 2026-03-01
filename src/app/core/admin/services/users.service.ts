import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../http/api.service';
import { UserEntity } from '../../models/user.model';

export type UserUpdate = Partial<Omit<UserEntity, 'id'>> & { password?: string };
export type UserCreate = Omit<UserEntity, 'id'> & { password: string };

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly api = inject(ApiService);

  public getUsers(): Observable<UserEntity[]> {
    return this.api.get<UserEntity[]>('users');
  }

  public updateUser(id: number, data: UserUpdate): Observable<UserEntity> {
    return this.api.put<UserEntity>(`users/${id}`, data as UserEntity);
  }

  public createUser(data: UserCreate): Observable<UserEntity> {
    return this.api.post<UserCreate, UserEntity>('users', data);
  }

  public deleteUser(id: number): Observable<UserEntity> {
    return this.api.delete<UserEntity>(`users/${id}`, {} as UserEntity);
  }
}
