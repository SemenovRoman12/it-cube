import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { StudentLessonEntity } from '../models/student-lesson.model';
import { StudentSubjectEntity } from '../models/student-subject.model';

type SortOrder = 'asc' | 'desc';

interface TeacherGroupSubjectEntity {
  id: number;
  teacher_id: number;
  group_id: number;
  subject_id: number;
}

export interface StudentSubjectsPageQuery {
  page: number;
  limit: number;
  groupId: number;
  sortBy?: 'subject_id' | 'subject_name';
  order?: SortOrder;
  filters?: Record<string, string | number>;
}

export interface StudentSubjectsPageResult {
  items: StudentSubjectEntity[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class StudentSubjectsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  public getSubjectsPage(query: StudentSubjectsPageQuery): Observable<StudentSubjectsPageResult> {
    return this.getLegacySubjectsPage(query);
  }

  private getLegacySubjectsPage(query: StudentSubjectsPageQuery): Observable<StudentSubjectsPageResult> {
    return forkJoin({
      assignments: this.api.get<TeacherGroupSubjectEntity[]>(`teacher_group_subjects?group_id=${query.groupId}`),
      subjects: this.api.get<StudentSubjectEntity[]>('subjects'),
    }).pipe(
      map(({ assignments, subjects }) => {
        const allowedSubjectIds = new Set(assignments.map((item) => item.subject_id));
        const filtered = subjects.filter((subject) => allowedSubjectIds.has(subject.id));

        return this.applyQuery(filtered, query);
      }),
    );
  }

  private applyQuery(subjects: StudentSubjectEntity[], query: StudentSubjectsPageQuery): StudentSubjectsPageResult {
    const subjectNameFilter = query.filters?.['subject_name'];
    const subjectIdFilter = query.filters?.['subject_id'];
    const search = typeof subjectNameFilter === 'string' ? subjectNameFilter.replace('*', '').toLowerCase() : '';
    const searchById = typeof subjectIdFilter === 'number' ? subjectIdFilter : null;

    let result = [...subjects];

    if (search) {
      result = result.filter((subject) => subject.name.toLowerCase().includes(search));
    }

    if (searchById !== null) {
      result = result.filter((subject) => subject.id === searchById);
    }

    const sortBy = query.sortBy ?? 'subject_name';
    const order = query.order ?? 'asc';

    result.sort((a, b) => {
      const compareValue = sortBy === 'subject_id' ? a.id - b.id : a.name.localeCompare(b.name);
      return order === 'desc' ? -compareValue : compareValue;
    });

    const total = result.length;
    const start = (query.page - 1) * query.limit;
    const items = result.slice(start, start + query.limit);

    return { items, total };
  }

  public getLessonsByGroupAndSubject(groupId: number, subjectId: number): Observable<StudentLessonEntity[]> {
    return this.api.get<StudentLessonEntity[]>(`lessons?group_id=${groupId}&subject_id=${subjectId}`).pipe(
      map((lessons) => [...lessons].sort((first, second) => second.date.localeCompare(first.date))),
    );
  }
}

