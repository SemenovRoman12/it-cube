import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/http/api.service';
import { JournalEntryCreate, JournalEntryEntity, JournalEntryUpdate } from '../models/journal-entry.model';
import { LessonCreate, LessonEntity, LessonUpdate } from '../models/lesson.model';
import { UserEntity } from '../../../core/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class TeacherJournalApiService {
  private readonly api = inject(ApiService);

  /** Загружает студентов выбранной группы. */
  public getStudentsByGroup(groupId: number): Observable<UserEntity[]> {
    return this.api.get<UserEntity[]>(`users?role=user&group_id=${groupId}`);
  }

  /** Загружает уроки учителя по группе и предмету. */
  public getLessons(teacherId: number, groupId: number, subjectId: number): Observable<LessonEntity[]> {
    return this.api.get<LessonEntity[]>(
      `lessons?teacher_id=${teacherId}&group_id=${groupId}&subject_id=${subjectId}`,
    );
  }

  /** Создаёт новый урок. */
  public createLesson(payload: LessonCreate): Observable<LessonEntity> {
    return this.api.post<LessonCreate, LessonEntity>('lessons', payload);
  }

  /** Обновляет данные существующего урока. */
  public updateLesson(id: number, payload: LessonUpdate): Observable<LessonEntity> {
    return this.api.patch<LessonEntity>(`lessons/${id}`, payload as Partial<LessonEntity>);
  }

  /** Загружает записи журнала для одного урока. */
  public getJournalEntriesByLesson(lessonId: number): Observable<JournalEntryEntity[]> {
    return this.api.get<JournalEntryEntity[]>(`journal_entries?lesson_id=${lessonId}`);
  }

  /** Загружает и объединяет записи журнала сразу по нескольким урокам. */
  public getJournalEntriesByLessonIds(lessonIds: number[]): Observable<JournalEntryEntity[]> {
    if (!lessonIds.length) {
      return of([]);
    }

    const requests = lessonIds.map((lessonId) => this.getJournalEntriesByLesson(lessonId));
    return forkJoin(requests).pipe(map((chunks) => chunks.flat()));
  }

  /** Создаёт запись журнала (оценка/посещаемость/комментарий). */
  public createJournalEntry(payload: JournalEntryCreate): Observable<JournalEntryEntity> {
    return this.api.post<JournalEntryCreate, JournalEntryEntity>('journal_entries', payload);
  }

  /** Обновляет существующую запись журнала. */
  public updateJournalEntry(id: number, payload: JournalEntryUpdate): Observable<JournalEntryEntity> {
    return this.api.patch<JournalEntryEntity>(`journal_entries/${id}`, payload as Partial<JournalEntryEntity>);
  }
}

