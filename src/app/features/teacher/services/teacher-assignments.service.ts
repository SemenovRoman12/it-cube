import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { SubjectEntity } from '../models/subject.model';
import { TeacherGroupSubjectEntity } from '../models/teacher-group-subject.model';

@Injectable({
  providedIn: 'root',
})
export class TeacherAssignmentsService {
  private readonly api = inject(ApiService);

  /** Загружает все назначения учителя по группам и предметам (чтобы связать доступные группы и предметы которые ведет препод). */
  public getTeacherAssignments(teacherId: number): Observable<TeacherGroupSubjectEntity[]> {
    return this.api.get<TeacherGroupSubjectEntity[]>(`teacher_group_subjects?teacher_id=${teacherId}`);
  }

  /** Загружает назначения учителя только для выбранной группы. */
  public getTeacherAssignmentsByGroup(teacherId: number, groupId: number): Observable<TeacherGroupSubjectEntity[]> {
    return this.api.get<TeacherGroupSubjectEntity[]>(
      `teacher_group_subjects?teacher_id=${teacherId}&group_id=${groupId}`,
    );
  }

  /** Загружает справочник предметов. */
  public getSubjects(): Observable<SubjectEntity[]> {
    return this.api.get<SubjectEntity[]>('subjects');
  }
}

