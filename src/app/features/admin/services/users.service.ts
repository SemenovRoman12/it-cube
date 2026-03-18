import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { UserEntity } from '../../../core/models/user.model';

export type UserUpdate = Partial<Omit<UserEntity, 'id' | 'created_at'>> & { password?: string };
export type UserCreate = Omit<UserEntity, 'id' | 'created_at'> & { password: string };

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly api = inject(ApiService);

  public getUsers(): Observable<UserEntity[]> {
    return this.api.get<UserEntity[]>('users');
  }

  public updateUser(id: number, data: UserUpdate): Observable<UserEntity> {
    return this.api.patch<UserEntity>(`users/${id}`, data as Partial<UserEntity>);
  }

  public assignUserToGroup(id: number, groupId: number): Observable<UserEntity> {
    return this.updateUser(id, { group_id: groupId });
  }

  public removeUserFromGroup(id: number): Observable<UserEntity> {
    return this.updateUser(id, { group_id: null });
  }

  public createUser(data: UserCreate): Observable<UserEntity> {
    return this.api.post<UserCreate, UserEntity>('users', data);
  }

  public deleteUser(id: number): Observable<UserEntity> {
    return this.api.delete<UserEntity>(`users/${id}`, {} as UserEntity);
  }
}
