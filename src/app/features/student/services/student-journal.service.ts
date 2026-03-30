import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { UserEntity } from '../../../core/models/user.model';
import { JournalEntryEntity, MarkValue } from '../../teacher/models/journal-entry.model';
import { LessonEntity } from '../../teacher/models/lesson.model';
import { StudentSubjectEntity } from '../models/student-subject.model';
import { StudentJournalMarkVm } from '../models/student-journal-mark.model';
import { StudentJournalSubjectVm } from '../models/student-journal-subject.model';

interface TeacherGroupSubjectEntity {
  id: number;
  teacher_id: number;
  group_id: number;
  subject_id: number;
}

export interface StudentJournalVm {
  subjects: StudentJournalSubjectVm[];
  overallAverage: number | null;
  totalMarks: number;
}

@Injectable({
  providedIn: 'root',
})
export class StudentJournalService {
  private readonly api = inject(ApiService);

  public getStudentJournal(student: UserEntity | null): Observable<StudentJournalVm> {
    if (!student?.group_id) {
      return of({
        subjects: [],
        overallAverage: null,
        totalMarks: 0,
      });
    }

    return forkJoin({
      assignments: this.api.get<TeacherGroupSubjectEntity[]>(`teacher_group_subjects?group_id=${student.group_id}`),
      subjects: this.api.get<StudentSubjectEntity[]>('subjects'),
    }).pipe(
      map(({ assignments, subjects }) => {
        const uniqueSubjectIds = [...new Set(assignments.map((item) => item.subject_id))];
        const availableSubjects = subjects
          .filter((subject) => uniqueSubjectIds.includes(subject.id))
          .sort((left, right) => left.name.localeCompare(right.name));

        return availableSubjects;
      }),
      switchMap((subjects) => {
        if (!subjects.length) {
          return of({ subjects: [], lessonsBySubject: [] as LessonEntity[][] });
        }

        return forkJoin(subjects.map((subject) => this.getLessonsByGroupAndSubject(student.group_id!, subject.id))).pipe(
          map((lessonsBySubject) => ({ subjects, lessonsBySubject })),
        );
      }),
      switchMap(({ subjects, lessonsBySubject }) => {
        const lessonIds = lessonsBySubject.flat().map((lesson) => lesson.id);

        if (!lessonIds.length) {
          return of({
            subjects,
            lessonsBySubject,
            entries: [] as JournalEntryEntity[],
          });
        }

        return forkJoin(lessonIds.map((lessonId) => this.getJournalEntriesByLessonAndStudent(lessonId, student.id))).pipe(
          map((chunks) => ({
            subjects,
            lessonsBySubject,
            entries: chunks.flat(),
          })),
        );
      }),
      map(({ subjects, lessonsBySubject, entries }) => {
        const entryByLessonId = new Map<number, JournalEntryEntity>();
        entries.forEach((entry) => entryByLessonId.set(entry.lesson_id, entry));

        const subjectVms = subjects.map<StudentJournalSubjectVm>((subject, index) => {
          const marks = lessonsBySubject[index]
            .map<StudentJournalMarkVm>((lesson) => {
              const entry = entryByLessonId.get(lesson.id);

              return {
                lessonId: lesson.id,
                lessonDate: lesson.date,
                lessonTopic: lesson.topic,
                mark: entry?.mark ?? null,
                attendance: entry?.attendance ?? 'present',
                comment: entry?.comment ?? '',
              };
            })
            .sort((left, right) => right.lessonDate.localeCompare(left.lessonDate));

          const numericMarks = marks
            .map((item) => item.mark)
            .filter((mark): mark is MarkValue => mark != null && Number.isInteger(mark));

          const averageMark = numericMarks.length
            ? numericMarks.reduce((acc, current) => acc + current, 0) / numericMarks.length
            : null;

          return {
            subjectId: subject.id,
            subjectName: subject.name,
            marks,
            averageMark,
            marksCount: numericMarks.length,
          };
        });

        const allMarks = subjectVms.flatMap((subject) =>
          subject.marks
            .map((item) => item.mark)
            .filter((mark): mark is MarkValue => mark != null && Number.isInteger(mark)),
        );

        return {
          subjects: subjectVms,
          overallAverage: allMarks.length ? allMarks.reduce((acc, current) => acc + current, 0) / allMarks.length : null,
          totalMarks: allMarks.length,
        };
      }),
    );
  }

  private getLessonsByGroupAndSubject(groupId: number, subjectId: number): Observable<LessonEntity[]> {
    return this.api
      .get<LessonEntity[]>(`lessons?group_id=${groupId}&subject_id=${subjectId}`)
      .pipe(map((lessons) => [...lessons].sort((left, right) => right.date.localeCompare(left.date))));
  }

  private getJournalEntriesByLessonAndStudent(lessonId: number, studentId: number): Observable<JournalEntryEntity[]> {
    return this.api.get<JournalEntryEntity[]>(`journal_entries?lesson_id=${lessonId}&student_id=${studentId}`);
  }
}
