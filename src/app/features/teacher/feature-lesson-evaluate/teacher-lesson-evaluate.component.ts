import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { LessonSubmissionMemberEntity } from '../../../core/models/lesson-submission-member.model';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { NotificationCreate } from '../../../core/models/notification.model';
import { UserEntity } from '../../../core/models/user.model';
import { JournalEntryEntity, MarkValue } from '../models/journal-entry.model';
import { LessonEntity } from '../models/lesson.model';
import { TeacherJournalApiService } from '../services/teacher-journal-api.service';

interface JournalEntrySaveResult {
  entry: JournalEntryEntity;
  isUpdated: boolean;
  oldMark: MarkValue | null;
}

@Component({
  selector: 'teacher-lesson-evaluate',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './teacher-lesson-evaluate.component.html',
  styleUrl: './teacher-lesson-evaluate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherLessonEvaluateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly journalApi = inject(TeacherJournalApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lessonTitle = computed(() => this.lesson()?.title?.trim() || this.lesson()?.topic || '');

  public readonly lesson = signal<LessonEntity | null>(null);
  public readonly student = signal<UserEntity | null>(null);
  public readonly submission = signal<LessonSubmissionEntity | null>(null);
  public readonly teamMembers = signal<UserEntity[]>([]);
  public readonly isLoading = signal(false);
  public readonly isSaving = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  public readonly markOptions: MarkValue[] = [1, 2, 3, 4, 5];

  public readonly form = this.formBuilder.group({
    mark: this.formBuilder.control<MarkValue | null>(null, Validators.required),
    teacher_comment: this.formBuilder.nonNullable.control(''),
  });

  public readonly answerText = computed(() => this.submission()?.answer_text || null);

  public getTeamMembersLabel(): string {
    return this.teamMembers().map((item) => item.full_name).join(', ');
  }

  public readonly backRoute = computed(() => {
    const l = this.lesson();
    if (!l) {
      return ['/teacher/subjects'];
    }
    return [
      '/teacher/subjects/groups', String(l.group_id),
      'subjects', String(l.subject_id),
      'lessons', String(l.id), 'submissions',
    ];
  });

  public ngOnInit(): void {
    this.loadData();
  }

  public onSave(): void {
    const lesson = this.lesson();
    const student = this.student();
    if (!lesson || !student || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const mark = this.form.controls.mark.value;
    if (mark == null) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.saveSubmission(lesson.id, student.id, mark, this.form.controls.teacher_comment.value.trim())
      .pipe(
        switchMap((savedSubmission) =>
          this.upsertJournalEntries(lesson.id, mark, savedSubmission.teacher_comment),
        ),
        switchMap((results) =>
          this.createMarkNotifications(lesson, mark, results).pipe(
            map(() => results),
            catchError(() => of(results)),
          ),
        ),
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.EVALUATE_SAVE_ERROR');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result) {
          this.success.set('TEACHER.SUBJECTS_FEATURE.EVALUATE_SUCCESS');
        }
      });
  }

  private loadData(): void {
    const groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));

    if (!Number.isFinite(groupId) || !Number.isFinite(lessonId) || !Number.isFinite(studentId)) {
      this.error.set('TEACHER.SUBJECTS_FEATURE.LESSONS_INVALID_PARAMS');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      lesson: this.journalApi.getLessonById(lessonId),
      students: this.journalApi.getStudentsByGroup(groupId),
      submissions: this.journalApi.getLessonSubmissionsByLesson(lessonId),
      members: this.journalApi.getLessonSubmissionMembersByLesson(lessonId),
      entries: this.journalApi.getJournalEntriesByLesson(lessonId),
    })
      .pipe(
        catchError(() => {
          this.error.set('TEACHER.SUBJECTS_FEATURE.EVALUATE_ERROR');
          return of({
            lesson: null,
            students: [],
            submissions: [] as LessonSubmissionEntity[],
            members: [] as LessonSubmissionMemberEntity[],
            entries: [] as JournalEntryEntity[],
          });
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ lesson, students, submissions, members, entries }) => {
        if (!lesson) {
          this.error.set('TEACHER.SUBJECTS_FEATURE.SUBMISSIONS_LESSON_NOT_FOUND');
          return;
        }

        const student = students.find((item) => item.id === studentId) ?? null;
        if (!student) {
          this.error.set('TEACHER.SUBJECTS_FEATURE.EVALUATE_STUDENT_NOT_FOUND');
          return;
        }

        const currentMember = members.find((item) => item.student_id === studentId && item.status === 'accepted') ?? null;
        const submission = currentMember ? submissions.find((item) => item.id === currentMember.submission_id) ?? null : null;
        const acceptedMembers = currentMember
          ? members.filter((item) => item.submission_id === currentMember.submission_id && item.status === 'accepted')
          : [];
        const teamMembers = students.filter((item) => acceptedMembers.some((member) => member.student_id === item.id));
        const entry = entries.find((item) => item.student_id === studentId) ?? null;

        this.lesson.set(lesson);
        this.student.set(student);
        this.submission.set(submission);
        this.teamMembers.set(teamMembers);
        this.form.patchValue({
          mark: submission?.mark ?? entry?.mark ?? null,
          teacher_comment: submission?.teacher_comment ?? entry?.comment ?? '',
        });
      });
  }

  private saveSubmission(lessonId: number, studentId: number, mark: MarkValue, teacherComment: string) {
    const currentSubmission = this.submission();
    if (currentSubmission) {
      return this.journalApi.updateLessonSubmission(currentSubmission.id, { mark, teacher_comment: teacherComment }).pipe(
        map((saved) => {
          this.submission.set(saved);
          return saved;
        }),
      );
    }

    return this.journalApi.createLessonSubmission({
      lesson_id: lessonId,
      student_id: studentId,
      created_by_student_id: studentId,
      is_group_submission: false,
      answer_text: '',
      submitted_at: null,
      status: 'pending',
      teacher_comment: teacherComment,
      mark,
    }).pipe(
      map((saved) => {
        this.submission.set(saved);
        return saved;
      }),
    );
  }

  private upsertJournalEntries(lessonId: number, mark: MarkValue, comment: string) {
    const targetStudentIds = this.teamMembers().length ? this.teamMembers().map((item) => item.id) : [this.student()!.id];

    return this.journalApi.getJournalEntriesByLesson(lessonId).pipe(
      switchMap((entries) =>
        forkJoin(
          targetStudentIds.map((studentId) => {
            const existing = entries.find((item) => item.student_id === studentId);

            if (existing) {
              return this.journalApi.updateJournalEntry(existing.id, {
                mark,
                comment,
                attendance: existing.attendance,
              }).pipe(map((entry) => ({ entry, isUpdated: true, oldMark: existing.mark } satisfies JournalEntrySaveResult)));
            }

            return this.journalApi.createJournalEntry({
              lesson_id: lessonId,
              student_id: studentId,
              mark,
              attendance: 'present',
              comment,
            }).pipe(map((entry) => ({ entry, isUpdated: false, oldMark: null } satisfies JournalEntrySaveResult)));
          }),
        ),
      ),
    );
  }

  private createMarkNotifications(
    lesson: LessonEntity,
    mark: MarkValue,
    results: JournalEntrySaveResult[],
  ) {
    const lessonTitle = lesson.title?.trim() || lesson.topic;
    const targetStudents = this.teamMembers().length ? this.teamMembers() : (this.student() ? [this.student()!] : []);

    return forkJoin(
      results.map((result) => {
        const student = targetStudents.find((item) => item.id === result.entry.student_id);
        if (!student) {
          return of(null);
        }

        const payload: NotificationCreate = {
          user_id: student.id,
          type: 'mark_assigned',
          title: result.isUpdated ? 'Оценка изменена' : 'Новая оценка',
          message: result.isUpdated
            ? `Ваша оценка изменена с ${result.oldMark ?? '—'} на ${mark} по занятию "${lessonTitle}"`
            : `Вам выставлена оценка ${mark} по занятию "${lessonTitle}"`,
          is_read: false,
          created_at: new Date().toISOString(),
          read_at: null,
          lesson_id: lesson.id,
          subject_id: lesson.subject_id,
          group_id: lesson.group_id,
          teacher_id: lesson.teacher_id,
          student_id: student.id,
          submission_id: this.submission()?.id ?? null,
          submission_member_id: null,
          mark,
          entity_kind: 'journal_entry',
          entity_id: result.entry.id,
          link: `/student/subjects/${lesson.subject_id}/lessons/${lesson.id}`,
        };

        return this.journalApi.createNotification(payload);
      }),
    );
  }
}
