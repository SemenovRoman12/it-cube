import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/http/api.service';
import { API_URL } from '../../../core/http/api-url.token';
import { UserEntity } from '../../../core/models/user.model';

export type UserUpdate = Partial<Omit<UserEntity, 'id' | 'created_at'>> & { password?: string };
export type UserCreate = Omit<UserEntity, 'id'> & { password: string };

export interface UsersPageResult {
  items: UserEntity[];
  total: number;
}

export interface UsersPageQuery {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  public getUsers(): Observable<UserEntity[]> {
    return this.api.get<UserEntity[]>('users');
  }

  public getUsersPage(query: UsersPageQuery): Observable<UsersPageResult> {
    let params = new HttpParams().set('_page', query.page).set('_limit', query.limit);

    if (query.sortBy) {
      params = params.set('_sort', query.sortBy);
    }

    if (query.order) {
      params = params.set('_order', query.order);
    }

    return this.http
      .get<UserEntity[]>(`${this.apiUrl}/users`, {
        params,
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const totalHeader = response.headers.get('x-total-count') ?? response.headers.get('X-Total-Count');
          const fallbackTotal = response.body?.length ?? 0;

          return {
            items: response.body ?? [],
            total: Number(totalHeader ?? fallbackTotal),
          };
        }),
      );
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
