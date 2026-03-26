import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/http/api.service';
import { API_URL } from '../../../core/http/api-url.token';
import { SubjectEntity } from '../../../core/models/subject.model';

export type SubjectCreate = Omit<SubjectEntity, 'id'>;
export type SubjectUpdate = Partial<Omit<SubjectEntity, 'id'>>;

export interface SubjectsPageQuery {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string | number>;
}

export interface SubjectsPageResult {
  items: SubjectEntity[];
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
export class SubjectsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  public getSubjects(): Observable<SubjectEntity[]> {
    return this.api.get<SubjectEntity[]>('subjects');
  }

  public getSubjectsPage(query: SubjectsPageQuery): Observable<SubjectsPageResult> {
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

    return this.http.get<MokkyPageResponse<SubjectEntity>>(`${this.apiUrl}/subjects`, { params }).pipe(
      map((response) => ({
        items: response.items ?? [],
        total: response.meta?.total_items ?? response.items?.length ?? 0,
      })),
    );
  }

  public createSubject(data: SubjectCreate): Observable<SubjectEntity> {
    return this.api.post<SubjectCreate, SubjectEntity>('subjects', data);
  }

  public updateSubject(id: number, data: SubjectUpdate): Observable<SubjectEntity> {
    return this.api.patch<SubjectEntity>(`subjects/${id}`, data as Partial<SubjectEntity>);
  }

  public deleteSubject(id: number): Observable<SubjectEntity> {
    return this.api.delete<SubjectEntity>(`subjects/${id}`, {} as SubjectEntity);
  }
}

