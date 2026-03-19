import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/http/api.service';
import { API_URL } from '../../../core/http/api-url.token';
import { GroupEntity } from '../../../core/models/group.model';

export type GroupCreate = Omit<GroupEntity, 'id'>;
export type GroupUpdate = Partial<Omit<GroupEntity, 'id'>>;

export interface GroupsPageQuery {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string | number>;
}

export interface GroupsPageResult {
  items: GroupEntity[];
  total: number;
}

interface MokkyPageResponse<T> {
  meta: {
    total_items: number;
  };
  items: T[];
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  public getGroups(): Observable<GroupEntity[]> {
    return this.api.get<GroupEntity[]>('group');
  }

  public getGroupsPage(query: GroupsPageQuery): Observable<GroupsPageResult> {
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

    return this.http.get<MokkyPageResponse<GroupEntity>>(`${this.apiUrl}/group`, { params }).pipe(
      map((response) => ({
        items: response.items ?? [],
        total: response.meta?.total_items ?? response.items?.length ?? 0,
      })),
    );
  }

  public getGroupById(id: number): Observable<GroupEntity> {
    return this.api.get<GroupEntity>(`group/${id}`);
  }

  public createGroup(data: GroupCreate): Observable<GroupEntity> {
    return this.api.post<GroupCreate, GroupEntity>('group', data);
  }

  public updateGroup(id: number, data: GroupUpdate): Observable<GroupEntity> {
    return this.api.patch<GroupEntity>(`group/${id}`, data as Partial<GroupEntity>);
  }

  public deleteGroup(id: number): Observable<GroupEntity> {
    return this.api.delete<GroupEntity>(`group/${id}`, {} as GroupEntity);
  }
}

