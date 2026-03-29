import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import {
  LessonSubmissionCreate,
  LessonSubmissionEntity,
  LessonSubmissionUpdate,
} from '../../../core/models/lesson-submission.model';
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

  public getLessonById(lessonId: number): Observable<StudentLessonEntity | null> {
    return this.api.get<StudentLessonEntity[]>(`lessons?id=${lessonId}`).pipe(map((items) => items[0] ?? null));
  }

  public getStudentSubmissionMap(
    lessonIds: number[],
    studentId: number,
  ): Observable<Record<number, LessonSubmissionEntity | null>> {
    if (!lessonIds.length) {
      return of({});
    }

    const requests = lessonIds.map((lessonId) =>
      this.api.get<LessonSubmissionEntity[]>(`lesson_submissions?lesson_id=${lessonId}&student_id=${studentId}`),
    );

    return forkJoin(requests).pipe(
      map((chunks) =>
        lessonIds.reduce<Record<number, LessonSubmissionEntity | null>>((acc, lessonId, index) => {
          acc[lessonId] = chunks[index]?.[0] ?? null;
          return acc;
        }, {}),
      ),
    );
  }

  public getStudentSubmission(lessonId: number, studentId: number): Observable<LessonSubmissionEntity | null> {
    return this.api
      .get<LessonSubmissionEntity[]>(`lesson_submissions?lesson_id=${lessonId}&student_id=${studentId}`)
      .pipe(map((items) => items[0] ?? null));
  }

  public upsertStudentSubmission(
    lessonId: number,
    studentId: number,
    payload: Pick<LessonSubmissionCreate, 'answer_text' | 'submitted_at' | 'status'>,
  ): Observable<LessonSubmissionEntity> {
    return this.getStudentSubmission(lessonId, studentId).pipe(
      switchMap((existing) => {
        if (existing) {
          const patch: LessonSubmissionUpdate = {
            answer_text: payload.answer_text,
            submitted_at: payload.submitted_at,
            status: payload.status,
          };
          return this.api.patch<LessonSubmissionEntity>(`lesson_submissions/${existing.id}`, patch);
        }

        const createPayload: LessonSubmissionCreate = {
          lesson_id: lessonId,
          student_id: studentId,
          answer_text: payload.answer_text,
          submitted_at: payload.submitted_at,
          status: payload.status,
          teacher_comment: '',
          mark: null,
        };

        return this.api.post<LessonSubmissionCreate, LessonSubmissionEntity>('lesson_submissions', createPayload);
      }),
    );
  }
}

