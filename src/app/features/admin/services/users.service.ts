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
  currentPage: number;
  totalPages: number;
  remainingCount: number;
}

interface MokkyPageMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
  remaining_count: number;
}

interface MokkyPageResponse<T> {
  meta: MokkyPageMeta;
  items: T[];
}

export interface UsersPageQuery {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string | number>;
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

  public getUsersByFilters(filters: Record<string, string | number>): Observable<UserEntity[]> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      params = params.set(key, String(value));
    });

    return this.http.get<UserEntity[]>(`${this.apiUrl}/users`, { params });
  }

  public getUsersPage(query: UsersPageQuery): Observable<UsersPageResult> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);

    if (query.sortBy) {
      const prefix = query.order === 'desc' ? '-' : '';
      params = params.set('sortBy', `${prefix}${query.sortBy}`);
    }

    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        params = params.set(key, String(value));
      });
    }

    return this.http.get<MokkyPageResponse<UserEntity>>(`${this.apiUrl}/users`, { params }).pipe(
      map((response) => ({
        items: response.items ?? [],
        total: response.meta?.total_items ?? response.items?.length ?? 0,
        currentPage: response.meta?.current_page ?? query.page,
        totalPages: response.meta?.total_pages ?? 1,
        remainingCount: response.meta?.remaining_count ?? 0,
      })),
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
