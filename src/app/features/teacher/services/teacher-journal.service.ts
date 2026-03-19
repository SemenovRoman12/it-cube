import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { GroupEntity } from '../../../core/models/group.model';
import {
  AttendanceStatus,
  JournalEntryCreate,
  JournalEntryEntity,
  JournalEntryUpdate,
  MarkValue,
} from '../models/journal-entry.model';
import { JournalCellVm, JournalGridVm, JournalRowVm } from '../models/journal-table.model';
import { LessonEntity } from '../models/lesson.model';
import { SubjectEntity } from '../models/subject.model';
import { TeacherGroupSubjectEntity } from '../models/teacher-group-subject.model';
import { UserEntity } from '../../../core/models/user.model';
import { GroupsService } from '../../admin/services/groups.service';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { TeacherJournalApiService } from './teacher-journal-api.service';

interface JournalCellDraft {
  lessonId: number;
  studentId: number;
  mark: MarkValue | null;
  attendance: AttendanceStatus;
  comment: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeacherJournalService {
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly journalApi = inject(TeacherJournalApiService);
  private readonly groupsService = inject(GroupsService);

  private readonly _teacherId = signal<number | null>(null);
  private readonly _assignments = signal<TeacherGroupSubjectEntity[]>([]);
  private readonly _allGroups = signal<GroupEntity[]>([]);
  private readonly _allSubjects = signal<SubjectEntity[]>([]);
  private readonly _students = signal<UserEntity[]>([]);
  private readonly _lessons = signal<LessonEntity[]>([]);
  private readonly _entries = signal<JournalEntryEntity[]>([]);
  private readonly _selectedGroupId = signal<number | null>(null);
  private readonly _selectedSubjectId = signal<number | null>(null);
  private readonly _dirty = signal<Map<string, JournalCellDraft>>(new Map());
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _error = signal<string | null>(null);

  public readonly isLoading = this._isLoading.asReadonly();
  public readonly isSaving = this._isSaving.asReadonly();
  public readonly error = this._error.asReadonly();
  public readonly students = this._students.asReadonly();
  public readonly lessons = computed(() => [...this._lessons()].sort((a, b) => a.date.localeCompare(b.date)));
  public readonly selectedGroupId = this._selectedGroupId.asReadonly();
  public readonly selectedSubjectId = this._selectedSubjectId.asReadonly();
  public readonly hasDirtyChanges = computed(() => this._dirty().size > 0);

  public readonly groups = computed(() => {
    const groupIds = new Set(this._assignments().map((item) => item.group_id));
    return this._allGroups().filter((group) => groupIds.has(group.id));
  });

  public readonly subjects = computed(() => {
    const groupId = this._selectedGroupId();
    if (groupId == null) {
      return [] as SubjectEntity[];
    }

    const subjectIds = new Set(
      this._assignments()
        .filter((item) => item.group_id === groupId)
        .map((item) => item.subject_id),
    );

    return this._allSubjects().filter((subject) => subjectIds.has(subject.id));
  });

  public readonly journalGrid = computed<JournalGridVm>(() => {
    const lessons = this.lessons();
    const baseMap = this.buildEntryMap(this._entries());
    const dirtyMap = this._dirty();

    const rows: JournalRowVm[] = this._students().map((student) => {
      const cells: JournalCellVm[] = lessons.map((lesson) => {
        const key = this.getCellKey(lesson.id, student.id);
        const entry = baseMap.get(key) ?? null;
        const draft = dirtyMap.get(key);

        return {
          lessonId: lesson.id,
          studentId: student.id,
          entryId: entry?.id ?? null,
          mark: draft?.mark ?? entry?.mark ?? null,
          attendance: draft?.attendance ?? entry?.attendance ?? 'present',
          comment: draft?.comment ?? entry?.comment ?? '',
          isDirty: dirtyMap.has(key),
        };
      });

      return { student, cells };
    });

    return {
      lessons,
      rows,
    };
  });

  public initialize(teacherId: number): Observable<void> {
    this._teacherId.set(teacherId);
    this._isLoading.set(true);
    this._error.set(null);

    return forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(teacherId),
      groups: this.groupsService.getGroups(),
      subjects: this.assignmentsService.getSubjects(),
    }).pipe(
      tap(({ assignments, groups, subjects }) => {
        this._assignments.set(assignments);
        this._allGroups.set(groups);
        this._allSubjects.set(subjects);

        const firstGroupId = this.groups()[0]?.id ?? null;
        this._selectedGroupId.set(firstGroupId);

        const firstSubjectId = this.subjects()[0]?.id ?? null;
        this._selectedSubjectId.set(firstSubjectId);
      }),
      switchMap(() => this.reloadJournalData()),
      map(() => void 0),
      catchError(() => {
        this._error.set('Ошибка загрузки журнала.');
        return of(void 0);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  public selectGroup(groupId: number): Observable<void> {
    this._selectedGroupId.set(groupId);
    const availableSubjects = this.subjects();
    const hasCurrentSubject = availableSubjects.some((subject) => subject.id === this._selectedSubjectId());
    this._selectedSubjectId.set(hasCurrentSubject ? this._selectedSubjectId() : (availableSubjects[0]?.id ?? null));
    return this.reloadJournalData();
  }

  public selectSubject(subjectId: number): Observable<void> {
    this._selectedSubjectId.set(subjectId);
    return this.reloadJournalData();
  }

  public createLesson(topic: string, date: string): Observable<LessonEntity | null> {
    const teacherId = this._teacherId();
    const groupId = this._selectedGroupId();
    const subjectId = this._selectedSubjectId();

    if (teacherId == null || groupId == null || subjectId == null) {
      return of(null);
    }

    this._isSaving.set(true);
    this._error.set(null);

    return this.journalApi
      .createLesson({
        teacher_id: teacherId,
        group_id: groupId,
        subject_id: subjectId,
        date,
        topic,
      })
      .pipe(
        tap((lesson) => this._lessons.set([...this._lessons(), lesson])),
        catchError(() => {
          this._error.set('Ошибка создания урока.');
          return of(null);
        }),
        finalize(() => this._isSaving.set(false)),
      );
  }

  public updateCellDraft(
    lessonId: number,
    studentId: number,
    patch: Partial<Pick<JournalCellDraft, 'mark' | 'attendance' | 'comment'>>,
  ): void {
    const key = this.getCellKey(lessonId, studentId);
    const entryMap = this.buildEntryMap(this._entries());
    const base = entryMap.get(key);
    const existingDraft = this._dirty().get(key);

    const nextDraft: JournalCellDraft = {
      lessonId,
      studentId,
      mark: patch.mark ?? existingDraft?.mark ?? base?.mark ?? null,
      attendance: patch.attendance ?? existingDraft?.attendance ?? base?.attendance ?? 'present',
      comment: patch.comment ?? existingDraft?.comment ?? base?.comment ?? '',
    };

    const isEqualToBase =
      (base?.mark ?? null) === nextDraft.mark &&
      (base?.attendance ?? 'present') === nextDraft.attendance &&
      (base?.comment ?? '') === nextDraft.comment;

    const nextMap = new Map(this._dirty());
    if (isEqualToBase) {
      nextMap.delete(key);
    } else {
      nextMap.set(key, nextDraft);
    }

    this._dirty.set(nextMap);
  }

  public saveChanges(): Observable<boolean> {
    const dirtyItems = [...this._dirty().values()];
    if (!dirtyItems.length) {
      return of(true);
    }

    this._isSaving.set(true);
    this._error.set(null);

    const entryMap = this.buildEntryMap(this._entries());
    const requests = dirtyItems.map((draft) => {
      const key = this.getCellKey(draft.lessonId, draft.studentId);
      const existing = entryMap.get(key);

      if (existing) {
        const payload: JournalEntryUpdate = {
          mark: draft.mark,
          attendance: draft.attendance,
          comment: draft.comment,
        };

        return this.journalApi.updateJournalEntry(existing.id, payload);
      }

      const payload: JournalEntryCreate = {
        lesson_id: draft.lessonId,
        student_id: draft.studentId,
        mark: draft.mark,
        attendance: draft.attendance,
        comment: draft.comment,
      };

      return this.journalApi.createJournalEntry(payload);
    });

    return forkJoin(requests).pipe(
      tap((savedEntries) => {
        const mapByKey = this.buildEntryMap(this._entries());
        savedEntries.forEach((entry) => mapByKey.set(this.getCellKey(entry.lesson_id, entry.student_id), entry));
        this._entries.set([...mapByKey.values()]);
        this._dirty.set(new Map());
      }),
      map(() => true),
      catchError(() => {
        this._error.set('Ошибка сохранения журнала.');
        return of(false);
      }),
      finalize(() => this._isSaving.set(false)),
    );
  }

  public resetLocalChanges(): void {
    this._dirty.set(new Map());
  }

  private reloadJournalData(): Observable<void> {
    const groupId = this._selectedGroupId();
    const subjectId = this._selectedSubjectId();
    const teacherId = this._teacherId();

    if (groupId == null || subjectId == null || teacherId == null) {
      this._students.set([]);
      this._lessons.set([]);
      this._entries.set([]);
      this._dirty.set(new Map());
      return of(void 0);
    }

    this._isLoading.set(true);
    this._error.set(null);
    this._dirty.set(new Map());

    return forkJoin({
      students: this.journalApi.getStudentsByGroup(groupId),
      lessons: this.journalApi.getLessons(teacherId, groupId, subjectId),
    }).pipe(
      switchMap(({ students, lessons }) =>
        this.journalApi.getJournalEntriesByLessonIds(lessons.map((lesson) => lesson.id)).pipe(
          tap((entries) => {
            this._students.set(students);
            this._lessons.set(lessons);
            this._entries.set(entries);
          }),
        ),
      ),
      map(() => void 0),
      catchError(() => {
        this._error.set('Ошибка загрузки данных журнала.');
        this._students.set([]);
        this._lessons.set([]);
        this._entries.set([]);
        return of(void 0);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  private getCellKey(lessonId: number, studentId: number): string {
    return `${lessonId}:${studentId}`;
  }

  private buildEntryMap(entries: JournalEntryEntity[]): Map<string, JournalEntryEntity> {
    const mapByKey = new Map<string, JournalEntryEntity>();
    entries.forEach((entry) => mapByKey.set(this.getCellKey(entry.lesson_id, entry.student_id), entry));
    return mapByKey;
  }
}

