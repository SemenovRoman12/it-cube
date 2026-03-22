import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { StudentSubjectEntity } from '../models/student-subject.model';

interface TeacherGroupSubjectEntity {
  id: number;
  teacher_id: number;
  group_id: number;
  subject_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class StudentSubjectsService {
  private readonly api = inject(ApiService);

  public getSubjectsByGroup(groupId: number): Observable<StudentSubjectEntity[]> {
    return forkJoin({
      assignments: this.api.get<TeacherGroupSubjectEntity[]>(`teacher_group_subjects?group_id=${groupId}`),
      subjects: this.api.get<StudentSubjectEntity[]>('subjects'),
    }).pipe(
      map(({ assignments, subjects }) => {
        const allowedSubjectIds = new Set(assignments.map((item) => item.subject_id));

        return subjects
          .filter((subject) => allowedSubjectIds.has(subject.id))
          .sort((first, second) => first.name.localeCompare(second.name));
      }),
    );
  }
}

