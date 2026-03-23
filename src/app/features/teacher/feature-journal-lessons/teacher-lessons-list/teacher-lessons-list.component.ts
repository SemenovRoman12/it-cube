import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, finalize, switchMap, tap, toArray } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserEntity } from '../../../../core/models/user.model';
import { GroupsService } from '../../../admin/services/groups.service';
import {
  JournalQuarterId,
  JOURNAL_QUARTER_OPTIONS,
  getQuarterBounds,
  listIsoDatesInRange,
  resolveAcademicStartYear,
} from '../models/journal-quarter.config';
import { JournalCellEditDialogComponent, JournalCellEditDialogResult } from '../journal-cell-edit-dialog/journal-cell-edit-dialog.component';
import { JournalTableComponent } from '../journal-table/journal-table.component';
import { JournalEntryCreate, JournalEntryEntity, JournalEntryUpdate } from '../../models/journal-entry.model';
import { JournalCellVm, JournalGridVm } from '../../models/journal-table.model';
import { LessonEntity } from '../../models/lesson.model';
import { SubjectEntity } from '../../models/subject.model';
import { TeacherAssignmentsService } from '../../services/teacher-assignments.service';
import { TeacherJournalApiService } from '../../services/teacher-journal-api.service';
import { TeacherGroupSubjectEntity } from '../../models/teacher-group-subject.model';

@Component({
  selector: 'teacher-lessons-list',
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    JournalTableComponent,
  ],
  templateUrl: './teacher-lessons-list.component.html',
  styleUrl: './teacher-lessons-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonsListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);
  private readonly assignmentsService = inject(TeacherAssignmentsService);
  private readonly journalApi = inject(TeacherJournalApiService);

  private readonly allAssignments = signal<TeacherGroupSubjectEntity[]>([]);
  private readonly allSubjects = signal<SubjectEntity[]>([]);
  private readonly students = signal<UserEntity[]>([]);
  private readonly lessons = signal<LessonEntity[]>([]);
  private readonly entries = signal<JournalEntryEntity[]>([]);
  private readonly dirty = signal<Map<string, JournalCellVm>>(new Map());

  public readonly subjects = signal<SubjectEntity[]>([]);
  public readonly selectedSubjectId = signal<number | null>(null);
  public readonly selectedQuarter = signal<JournalQuarterId>('q1');
  public readonly quarterOptions = JOURNAL_QUARTER_OPTIONS;
  public readonly isLoading = signal(false);
  public readonly isSaving = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly selectedSubjectName = computed(() => {
    const subjectId = this.selectedSubjectId();
    if (subjectId == null) {
      return '';
    }

    return this.subjects().find((subject) => subject.id === subjectId)?.name ?? '';
  });

  public readonly hasDirtyChanges = computed(() => this.dirty().size > 0);

  public readonly quarterDates = computed(() => {
    const academicStartYear = resolveAcademicStartYear(this.lessons().map((lesson) => lesson.date));
    const bounds = getQuarterBounds(this.selectedQuarter(), academicStartYear);
    return listIsoDatesInRange(bounds);
  });

  public readonly displayLessons = computed(() => {
    const quarterDates = this.quarterDates();
    const lessonsByDate = this.buildLessonByDateMap(this.lessons());

    return quarterDates.map((date, index) => {
      const lesson = lessonsByDate.get(date);
      if (lesson) {
        return lesson;
      }

      return {
        id: -(index + 1),
        teacher_id: 0,
        group_id: 0,
        subject_id: 0,
        date,
        topic: '',
      } as LessonEntity;
    });
  });

  public readonly journalGrid = computed<JournalGridVm>(() => {
    const lessonList = this.displayLessons();
    const baseMap = this.buildEntryMap(this.entries());
    const dirtyMap = this.dirty();

    const rows = this.students().map((student) => ({
      student,
      cells: lessonList.map((lesson) => {
        const key = this.getCellKey(lesson.id, student.id);
        const realLessonId = lesson.id > 0 ? lesson.id : null;
        const base = realLessonId == null ? null : baseMap.get(this.getEntryKey(realLessonId, student.id));
        const draft = dirtyMap.get(key);

        return {
          lessonId: lesson.id,
          lessonDate: lesson.date,
          realLessonId: draft?.realLessonId ?? realLessonId,
          studentId: student.id,
          entryId: base?.id ?? null,
          mark: draft?.mark ?? base?.mark ?? null,
          attendance: draft?.attendance ?? base?.attendance ?? 'present',
          comment: draft?.comment ?? base?.comment ?? '',
          isDirty: dirtyMap.has(key),
        };
      }),
    }));

    return {
      lessons: lessonList,
      rows,
    };
  });

  public ngOnInit(): void {
    this.loadPageData();
  }

  public onSubjectChange(subjectId: number): void {
    this.selectedSubjectId.set(subjectId);
    this.loadJournalData();
  }

  public onQuarterChange(quarter: JournalQuarterId): void {
    this.selectedQuarter.set(quarter);
  }

  public onCellEdit(cell: JournalCellVm): void {
    this.dialog
      .open<JournalCellEditDialogComponent, { cell: JournalCellVm }, JournalCellEditDialogResult>(
        JournalCellEditDialogComponent,
        {
          data: { cell },
          width: '480px',
        },
      )
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.updateCellDraft(cell, result);
      });
  }

  public onResetChanges(): void {
    this.dirty.set(new Map());
  }

  public onExportClick(): void {
    // Заглушка для будущей выгрузки в Excel.
  }

  public onSaveChanges(): void {
    const teacherId = this.authService.user()?.id;
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    const subjectId = this.selectedSubjectId();
    const dirtyCells = [...this.dirty().values()];

    if (!dirtyCells.length || teacherId == null || Number.isNaN(groupId) || subjectId == null) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    const entryMap = this.buildEntryMap(this.entries());
    const createdLessonsByDate = new Map<string, LessonEntity>();

    from(dirtyCells)
      .pipe(
        concatMap((cell) =>
          this.resolveLessonForCell(cell, teacherId, groupId, subjectId, createdLessonsByDate).pipe(
            switchMap((lesson) => {
              const existing = entryMap.get(this.getEntryKey(lesson.id, cell.studentId));

              if (existing) {
                const payload: JournalEntryUpdate = {
                  mark: cell.mark,
                  attendance: cell.attendance,
                  comment: cell.comment,
                };
                return this.journalApi.updateJournalEntry(existing.id, payload);
              }

              const payload: JournalEntryCreate = {
                lesson_id: lesson.id,
                student_id: cell.studentId,
                mark: cell.mark,
                attendance: cell.attendance,
                comment: cell.comment,
              };
              return this.journalApi.createJournalEntry(payload);
            }),
            tap((savedEntry) =>
              entryMap.set(this.getEntryKey(savedEntry.lesson_id, savedEntry.student_id), savedEntry),
            ),
          ),
        ),
        toArray(),
      )
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.entries.set([...entryMap.values()]);
          this.dirty.set(new Map());
        },
        error: () => {
          this.error.set('Не удалось сохранить изменения журнала.');
        },
      });
  }

  private loadPageData(): void {
    const teacherId = this.authService.user()?.id;
    if (teacherId == null) {
      this.error.set('Не удалось определить преподавателя.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentsService.getTeacherAssignments(teacherId),
      groups: this.groupsService.getGroups(),
      subjects: this.assignmentsService.getSubjects(),
    }).subscribe({
      next: ({ assignments, groups, subjects }) => {
        this.allAssignments.set(assignments);
        this.allSubjects.set(subjects);

        const allowedGroupIds = new Set(assignments.map((item) => item.group_id));
        const availableGroups = groups.filter((group) => allowedGroupIds.has(group.id));

        if (!availableGroups.length) {
          this.error.set('Нет доступных групп.');
          this.isLoading.set(false);
          return;
        }

        const routeGroupId = Number(this.route.snapshot.paramMap.get('groupId'));
        const hasAccessToRouteGroup = availableGroups.some((group) => group.id === routeGroupId);

        if (!hasAccessToRouteGroup) {
          this.error.set('Доступ запрещен.');
          this.subjects.set([]);
          this.selectedSubjectId.set(null);
          this.isLoading.set(false);
          return;
        }

        this.syncSubjectsForGroup(routeGroupId);
        this.loadJournalData();
      },
      error: () => {
        this.error.set('Ошибка загрузки данных страницы.');
        this.isLoading.set(false);
      },
    });
  }

  private syncSubjectsForGroup(groupId: number): void {
    const allowedSubjectIds = new Set(
      this.allAssignments()
        .filter((assignment) => assignment.group_id === groupId)
        .map((assignment) => assignment.subject_id),
    );

    const availableSubjects = this.allSubjects().filter((subject) => allowedSubjectIds.has(subject.id));
    this.subjects.set(availableSubjects);

    const currentSubjectId = this.selectedSubjectId();
    const hasCurrent = availableSubjects.some((subject) => subject.id === currentSubjectId);
    this.selectedSubjectId.set(hasCurrent ? currentSubjectId : (availableSubjects[0]?.id ?? null));
  }

  private loadJournalData(): void {
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    const subjectId = this.selectedSubjectId();

    if (Number.isNaN(groupId) || subjectId == null) {
      this.students.set([]);
      this.lessons.set([]);
      this.entries.set([]);
      this.dirty.set(new Map());
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      students: this.journalApi.getStudentsByGroup(groupId),
      lessons: this.journalApi.getLessonsByGroupAndSubject(groupId, subjectId),
    })
      .pipe(
        switchMap(({ students, lessons }) =>
          this.journalApi.getJournalEntriesByLessonIds(lessons.map((lesson) => lesson.id)).pipe(
            catchError(() => of([])),
            switchMap((entries) => of({ students, lessons, entries })),
          ),
        ),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ students, lessons, entries }) => {
          this.students.set(students);
          this.lessons.set(lessons);
          this.entries.set(entries);
          this.dirty.set(new Map());
        },
        error: () => {
          this.error.set('Ошибка загрузки данных журнала.');
          this.students.set([]);
          this.lessons.set([]);
          this.entries.set([]);
          this.dirty.set(new Map());
        },
      });
  }

  private updateCellDraft(
    cell: JournalCellVm,
    patch: Partial<Pick<JournalCellVm, 'mark' | 'attendance' | 'comment'>>,
  ): void {
    const key = this.getCellKey(cell.lessonId, cell.studentId);
    const baseMap = this.buildEntryMap(this.entries());
    const base =
      cell.realLessonId != null && cell.realLessonId > 0
        ? baseMap.get(this.getEntryKey(cell.realLessonId, cell.studentId))
        : null;
    const currentDraft = this.dirty().get(key);

    const nextDraft: JournalCellVm = {
      lessonId: cell.lessonId,
      lessonDate: cell.lessonDate,
      realLessonId: cell.realLessonId ?? null,
      studentId: cell.studentId,
      entryId: base?.id ?? null,
      mark: patch.mark ?? currentDraft?.mark ?? base?.mark ?? null,
      attendance: patch.attendance ?? currentDraft?.attendance ?? base?.attendance ?? 'present',
      comment: patch.comment ?? currentDraft?.comment ?? base?.comment ?? '',
      isDirty: true,
    };

    const equalsBase =
      (base?.mark ?? null) === nextDraft.mark &&
      (base?.attendance ?? 'present') === nextDraft.attendance &&
      (base?.comment ?? '') === nextDraft.comment;

    const updatedDirty = new Map(this.dirty());
    if (equalsBase) {
      updatedDirty.delete(key);
    } else {
      updatedDirty.set(key, nextDraft);
    }

    this.dirty.set(updatedDirty);
  }

  private getCellKey(lessonId: number, studentId: number): string {
    return `${lessonId}:${studentId}`;
  }

  private getEntryKey(lessonId: number, studentId: number): string {
    return `${lessonId}:${studentId}`;
  }

  private buildEntryMap(entries: JournalEntryEntity[]): Map<string, JournalEntryEntity> {
    const mapByKey = new Map<string, JournalEntryEntity>();
    entries.forEach((entry) => mapByKey.set(this.getEntryKey(entry.lesson_id, entry.student_id), entry));
    return mapByKey;
  }

  private buildLessonByDateMap(lessons: LessonEntity[]): Map<string, LessonEntity> {
    const mapByDate = new Map<string, LessonEntity>();
    lessons.forEach((lesson) => {
      if (!mapByDate.has(lesson.date)) {
        mapByDate.set(lesson.date, lesson);
      }
    });
    return mapByDate;
  }

  private resolveLessonForCell(
    cell: JournalCellVm,
    teacherId: number,
    groupId: number,
    subjectId: number,
    createdLessonsByDate: Map<string, LessonEntity>,
  ) {
    if (cell.realLessonId != null && cell.realLessonId > 0) {
      const lesson = this.lessons().find((item) => item.id === cell.realLessonId);
      if (lesson) {
        return of(lesson);
      }
    }

    const lessonDate = cell.lessonDate;
    if (!lessonDate) {
      return of(null as unknown as LessonEntity);
    }

    const alreadyCreated = createdLessonsByDate.get(lessonDate);
    if (alreadyCreated) {
      return of(alreadyCreated);
    }

    const existingByDate = this.buildLessonByDateMap(this.lessons()).get(lessonDate);
    if (existingByDate) {
      return of(existingByDate);
    }

    return this.journalApi
      .createLesson({
        teacher_id: teacherId,
        group_id: groupId,
        subject_id: subjectId,
        date: lessonDate,
        topic: this.buildAutoTopic(lessonDate),
      })
      .pipe(
        tap((createdLesson) => {
          createdLessonsByDate.set(lessonDate, createdLesson);
          this.lessons.set([...this.lessons(), createdLesson]);
        }),
      );
  }

  private buildAutoTopic(lessonDate: string): string {
    const [year, month, day] = lessonDate.split('-');
    if (!year || !month || !day) {
      return 'Урок';
    }

    return `Урок ${day}.${month}`;
  }
}
