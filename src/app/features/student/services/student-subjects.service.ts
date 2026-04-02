import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { LessonFileCreate, LessonFileEntity } from '../../../core/models/lesson-file.model';
import {
  LessonSubmissionCreate,
  LessonSubmissionEntity,
  LessonSubmissionUpdate,
} from '../../../core/models/lesson-submission.model';
import {
  LessonSubmissionMemberCreate,
  LessonSubmissionMemberEntity,
  LessonSubmissionMemberStatus,
  LessonSubmissionMemberUpdate,
} from '../../../core/models/lesson-submission-member.model';
import { NotificationCreate, NotificationEntity } from '../../../core/models/notification.model';
import { UserEntity } from '../../../core/models/user.model';
import { FileStorageService } from '../../../core/services/file-storage.service';
import { StudentLessonEntity } from '../models/student-lesson.model';
import { StudentSubjectEntity } from '../models/student-subject.model';

type SortOrder = 'asc' | 'desc';

type SubmissionSummaryStatus = 'pending' | 'invited' | 'submitted' | 'overdue' | 'graded';

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

export interface LessonSubmissionContext {
  submission: LessonSubmissionEntity | null;
  members: LessonSubmissionMemberEntity[];
  acceptedMembers: LessonSubmissionMemberEntity[];
  invitedMembers: LessonSubmissionMemberEntity[];
  currentMember: LessonSubmissionMemberEntity | null;
}

export interface LessonSubmissionSummary {
  context: LessonSubmissionContext | null;
  status: SubmissionSummaryStatus;
}

@Injectable({
  providedIn: 'root',
})
export class StudentSubjectsService {
  private readonly api = inject(ApiService);
  private readonly fileStorage = inject(FileStorageService);

  public getSubjectsPage(query: StudentSubjectsPageQuery): Observable<StudentSubjectsPageResult> {
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

  public getLessonsByGroupAndSubject(groupId: number, subjectId: number): Observable<StudentLessonEntity[]> {
    return this.api.get<StudentLessonEntity[]>(`lessons?group_id=${groupId}&subject_id=${subjectId}`).pipe(
      map((lessons) => [...lessons].sort((first, second) => second.date.localeCompare(first.date))),
    );
  }

  public getLessonById(lessonId: number): Observable<StudentLessonEntity | null> {
    return this.api.get<StudentLessonEntity>(`lessons/${lessonId}`).pipe(
      map((item) => item ?? null),
      catchError(() =>
        this.api.get<StudentLessonEntity[]>(`lessons?id=${lessonId}`).pipe(
          map((items) => items[0] ?? null),
          catchError(() => of(null)),
        ),
      ),
    );
  }

  public getGroupStudents(groupId: number): Observable<UserEntity[]> {
    return this.api.get<UserEntity[]>(`users?role=user&group_id=${groupId}`);
  }

  public getSubmissionContext(lessonId: number, studentId: number): Observable<LessonSubmissionContext | null> {
    return this.getSubmissionMembersByLesson(lessonId).pipe(
      switchMap((members) => {
        const currentMember = this.findCurrentMember(members, studentId);

        if (!currentMember) {
          return of(null);
        }

        return this.getSubmissionById(currentMember.submission_id).pipe(
          map((submission) => submission ? this.buildSubmissionContext(submission, members, currentMember) : null),
          catchError(() => of(null)),
        );
      }),
    );
  }

  public getSubmissionSummary(lesson: StudentLessonEntity, studentId: number): Observable<LessonSubmissionSummary> {
    return this.getSubmissionContext(lesson.id, studentId).pipe(
      map((context) => ({
        context,
        status: this.resolveSubmissionStatus(lesson, context),
      })),
      catchError(() => of({
        context: null,
        status: this.resolveSubmissionStatus(lesson, null),
      })),
    );
  }

  public getStudentSubmissionMap(
    lessonIds: number[],
    studentId: number,
  ): Observable<Record<number, LessonSubmissionEntity | null>> {
    if (!lessonIds.length) {
      return of({});
    }

    return forkJoin(
      lessonIds.map((lessonId) =>
        this.getSubmissionContext(lessonId, studentId).pipe(
          map((context) => context?.submission ?? null),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      map((chunks) =>
        lessonIds.reduce<Record<number, LessonSubmissionEntity | null>>((acc, lessonId, index) => {
          acc[lessonId] = chunks[index] ?? null;
          return acc;
        }, {}),
      ),
    );
  }

  public getStudentSubmission(lessonId: number, studentId: number): Observable<LessonSubmissionEntity | null> {
    return this.getSubmissionContext(lessonId, studentId).pipe(map((context) => context?.submission ?? null));
  }

  public getLessonFilesByLesson(lessonId: number): Observable<LessonFileEntity[]> {
    return this.api.get<LessonFileEntity[]>(`lesson_files?lesson_id=${lessonId}&owner_type=teacher_assignment`).pipe(
      catchError(() => of([])),
    );
  }

  public getLessonFilesBySubmission(submissionId: number): Observable<LessonFileEntity[]> {
    return this.api.get<LessonFileEntity[]>(`lesson_files?submission_id=${submissionId}&owner_type=student_submission`).pipe(
      catchError(() => of([])),
    );
  }

  public saveSubmissionFiles(
    lessonId: number,
    submissionId: number,
    uploadedByUserId: number,
    files: File[],
  ): Observable<LessonFileEntity[]> {
    if (!files.length) {
      return of([]);
    }

    return forkJoin(
      files.map((file) =>
        from(this.fileStorage.uploadSubmissionFile(submissionId, file)).pipe(
          switchMap((stored) => this.api.post<LessonFileCreate, LessonFileEntity>(
            'lesson_files',
            this.buildSubmissionFilePayload(lessonId, submissionId, uploadedByUserId, stored),
          )),
        ),
      ),
    );
  }

  public removeLessonFile(file: LessonFileEntity): Observable<void> {
    return from(this.fileStorage.removeFile(file.storage_path)).pipe(
      switchMap(() => this.api.delete<void>(`lesson_files/${file.id}`, undefined as void)),
    );
  }

  public saveAnswerAndInvite(
    lesson: StudentLessonEntity,
    student: UserEntity,
    answerText: string,
    status: LessonSubmissionEntity['status'],
    invitedStudentIds: number[],
  ): Observable<LessonSubmissionEntity> {
    const nowIso = new Date().toISOString();

    return this.getStudentSubmission(lesson.id, student.id).pipe(
      switchMap((existingSubmission) => {
        const save$ = existingSubmission
          ? this.api.patch<LessonSubmissionEntity>(`lesson_submissions/${existingSubmission.id}`, {
              answer_text: answerText,
              submitted_at: nowIso,
              status,
            } satisfies LessonSubmissionUpdate)
          : this.createSubmissionWithCreator(lesson.id, student.id, {
              answer_text: answerText,
              submitted_at: nowIso,
              status,
              is_group_submission: invitedStudentIds.length > 0,
            });

        return save$.pipe(
          switchMap((submission) => {
            if (!invitedStudentIds.length) {
              return of(submission);
            }

            return this.inviteMembersAndNotify(submission.id, lesson, student, invitedStudentIds).pipe(
              map(() => submission),
            );
          }),
        );
      }),
    );
  }

  public inviteMembersAndNotify(
    submissionId: number,
    lesson: StudentLessonEntity,
    creator: UserEntity,
    invitedStudentIds: number[],
  ): Observable<LessonSubmissionMemberEntity[]> {
    if (!invitedStudentIds.length) {
      return of([]);
    }

    return forkJoin(
      invitedStudentIds.map((studentId) =>
        this.inviteToSubmission(submissionId, lesson.id, creator.id, studentId).pipe(
          switchMap((member) =>
            this.createNotification(this.buildTeamNotification(
              lesson,
              creator.id,
              studentId,
              'submission_invited',
              'Приглашение в совместный ответ',
              `${creator.full_name} приглашает вас к совместному ответу по заданию.`,
              submissionId,
              member.id,
            )).pipe(map(() => member)),
          ),
        ),
      ),
    );
  }

  public acceptInvitationAndNotify(
    lesson: StudentLessonEntity,
    submission: LessonSubmissionEntity,
    memberId: number,
    actor: UserEntity,
  ): Observable<LessonSubmissionMemberEntity> {
    return this.respondToInvitation(memberId, 'accepted').pipe(
      switchMap((member) =>
        this.createNotification(this.buildTeamNotification(
          lesson,
          actor.id,
          submission.created_by_student_id,
          'submission_invite_accepted',
          'Приглашение принято',
          `${actor.full_name} присоединился(ась) к совместному ответу.`,
          submission.id,
          member.id,
        )).pipe(map(() => member)),
      ),
    );
  }

  public declineInvitationAndNotify(
    lesson: StudentLessonEntity,
    submission: LessonSubmissionEntity,
    memberId: number,
    actor: UserEntity,
  ): Observable<LessonSubmissionMemberEntity> {
    return this.respondToInvitation(memberId, 'declined').pipe(
      switchMap((member) =>
        this.createNotification(this.buildTeamNotification(
          lesson,
          actor.id,
          submission.created_by_student_id,
          'submission_invite_declined',
          'Приглашение отклонено',
          `${actor.full_name} отклонил(а) приглашение в совместный ответ.`,
          submission.id,
          member.id,
        )).pipe(map(() => member)),
      ),
    );
  }

  public leaveSubmissionAndNotify(
    lesson: StudentLessonEntity,
    submission: LessonSubmissionEntity,
    memberId: number,
    actor: UserEntity,
  ): Observable<LessonSubmissionMemberEntity> {
    return this.leaveSubmission(memberId).pipe(
      switchMap((member) =>
        this.createNotification(this.buildTeamNotification(
          lesson,
          actor.id,
          submission.created_by_student_id,
          'submission_member_left',
          'Участник вышел из команды',
          `${actor.full_name} вышел(ла) из совместного ответа.`,
          submission.id,
          member.id,
        )).pipe(map(() => member)),
      ),
    );
  }

  public removeMemberAndNotify(
    lesson: StudentLessonEntity,
    submission: LessonSubmissionEntity,
    member: LessonSubmissionMemberEntity,
  ): Observable<LessonSubmissionMemberEntity> {
    return this.removeSubmissionMember(member.id, member.status).pipe(
      switchMap((updatedMember) =>
        this.createNotification(this.buildTeamNotification(
          lesson,
          submission.created_by_student_id,
          member.student_id,
          'submission_member_left',
          'Вы исключены из совместного ответа',
          'Создатель удалил вас из совместного ответа по заданию.',
          submission.id,
          updatedMember.id,
        )).pipe(map(() => updatedMember)),
      ),
    );
  }

  public getSubmissionMembersBySubmission(submissionId: number): Observable<LessonSubmissionMemberEntity[]> {
    return this.api.get<LessonSubmissionMemberEntity[]>(`lesson_submission_members?submission_id=${submissionId}`).pipe(
      catchError(() => of([])),
    );
  }

  public respondToInvitation(memberId: number, status: Extract<LessonSubmissionMemberStatus, 'accepted' | 'declined'>) {
    return this.updateSubmissionMember(memberId, {
      status,
      responded_at: new Date().toISOString(),
    });
  }

  public leaveSubmission(memberId: number) {
    return this.updateSubmissionMember(memberId, {
      status: 'left',
      left_at: new Date().toISOString(),
    });
  }

  public removeSubmissionMember(memberId: number, currentStatus: LessonSubmissionMemberStatus) {
    return this.updateSubmissionMember(memberId, {
      status: currentStatus === 'invited' ? 'declined' : 'left',
      responded_at: new Date().toISOString(),
      left_at: currentStatus === 'accepted' ? new Date().toISOString() : null,
    });
  }

  public createNotification(payload: NotificationCreate): Observable<NotificationEntity> {
    return this.api.post<NotificationCreate, NotificationEntity>('notifications', payload);
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

  private getSubmissionMembersByLesson(lessonId: number): Observable<LessonSubmissionMemberEntity[]> {
    return this.api.get<LessonSubmissionMemberEntity[]>(`lesson_submission_members?lesson_id=${lessonId}`).pipe(
      catchError(() => of([])),
    );
  }

  private getSubmissionById(submissionId: number): Observable<LessonSubmissionEntity | null> {
    return this.api.get<LessonSubmissionEntity>(`lesson_submissions/${submissionId}`).pipe(
      map((item) => item ?? null),
      catchError(() =>
        this.api.get<LessonSubmissionEntity[]>(`lesson_submissions?id=${submissionId}`).pipe(
          map((items) => items[0] ?? null),
          catchError(() => of(null)),
        ),
      ),
    );
  }

  private updateSubmissionMember(memberId: number, payload: LessonSubmissionMemberUpdate) {
    return this.api.patch<LessonSubmissionMemberEntity>(`lesson_submission_members/${memberId}`, payload);
  }

  private createSubmissionWithCreator(
    lessonId: number,
    studentId: number,
    payload: Pick<LessonSubmissionCreate, 'answer_text' | 'submitted_at' | 'status' | 'is_group_submission'>,
  ): Observable<LessonSubmissionEntity> {
    const createPayload: LessonSubmissionCreate = {
      lesson_id: lessonId,
      student_id: studentId,
      created_by_student_id: studentId,
      is_group_submission: payload.is_group_submission,
      answer_text: payload.answer_text,
      submitted_at: payload.submitted_at,
      status: payload.status,
      teacher_comment: '',
      mark: null,
    };

    return this.api.post<LessonSubmissionCreate, LessonSubmissionEntity>('lesson_submissions', createPayload).pipe(
      switchMap((submission) =>
        this.api.post<LessonSubmissionMemberCreate, LessonSubmissionMemberEntity>('lesson_submission_members', {
          submission_id: submission.id,
          lesson_id: lessonId,
          student_id: studentId,
          role: 'creator',
          status: 'accepted',
          invited_by_student_id: studentId,
          invited_at: payload.submitted_at ?? new Date().toISOString(),
          responded_at: payload.submitted_at ?? new Date().toISOString(),
          left_at: null,
        }).pipe(map(() => submission)),
      ),
    );
  }

  private inviteToSubmission(submissionId: number, lessonId: number, invitedByStudentId: number, studentId: number) {
    const nowIso = new Date().toISOString();
    const payload: LessonSubmissionMemberCreate = {
      submission_id: submissionId,
      lesson_id: lessonId,
      student_id: studentId,
      role: 'member',
      status: 'invited',
      invited_by_student_id: invitedByStudentId,
      invited_at: nowIso,
      responded_at: null,
      left_at: null,
    };

    return this.api.post<LessonSubmissionMemberCreate, LessonSubmissionMemberEntity>('lesson_submission_members', payload);
  }

  private buildSubmissionFilePayload(
    lessonId: number,
    submissionId: number,
    uploadedByUserId: number,
    stored: Awaited<ReturnType<FileStorageService['uploadSubmissionFile']>>,
  ): LessonFileCreate {
    return {
      lesson_id: lessonId,
      submission_id: submissionId,
      owner_type: 'student_submission',
      uploaded_by_user_id: uploadedByUserId,
      file_name: stored.fileName,
      file_url: stored.fileUrl,
      storage_path: stored.storagePath,
      mime_type: stored.mimeType,
      size_bytes: stored.sizeBytes,
      created_at: new Date().toISOString(),
    };
  }

  private findCurrentMember(
    members: LessonSubmissionMemberEntity[],
    studentId: number,
  ): LessonSubmissionMemberEntity | null {
    return members.find((member) =>
      member.student_id === studentId && member.status !== 'declined' && member.status !== 'left') ?? null;
  }

  private buildSubmissionContext(
    submission: LessonSubmissionEntity,
    members: LessonSubmissionMemberEntity[],
    currentMember: LessonSubmissionMemberEntity,
  ): LessonSubmissionContext {
    const submissionMembers = members.filter((member) => member.submission_id === currentMember.submission_id);

    return {
      submission,
      members: submissionMembers,
      acceptedMembers: submissionMembers.filter((member) => member.status === 'accepted'),
      invitedMembers: submissionMembers.filter((member) => member.status === 'invited'),
      currentMember,
    };
  }

  private resolveSubmissionStatus(
    lesson: StudentLessonEntity,
    context: LessonSubmissionContext | null,
  ): SubmissionSummaryStatus {
    if (context?.submission?.mark != null) {
      return 'graded';
    }

    if (context?.currentMember?.status === 'invited') {
      return 'invited';
    }

    if (context?.submission?.status === 'submitted') {
      return 'submitted';
    }

    if (context?.submission?.status === 'overdue') {
      return 'overdue';
    }

    if (!lesson.due_at) {
      return 'pending';
    }

    return new Date(lesson.due_at).getTime() < Date.now() ? 'overdue' : 'pending';
  }

  private buildTeamNotification(
    lesson: StudentLessonEntity,
    actorStudentId: number,
    targetUserId: number,
    type: NotificationCreate['type'],
    title: string,
    message: string,
    submissionId: number,
    submissionMemberId: number | null,
  ): NotificationCreate {
    return {
      user_id: targetUserId,
      type,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
      read_at: null,
      lesson_id: lesson.id,
      subject_id: lesson.subject_id,
      group_id: lesson.group_id,
      teacher_id: lesson.teacher_id,
      student_id: actorStudentId,
      submission_id: submissionId,
      submission_member_id: submissionMemberId,
      mark: null,
      entity_kind: submissionMemberId ? 'lesson_submission_member' : 'lesson_submission',
      entity_id: submissionMemberId ?? submissionId,
      link: lessonLink(lesson.id, lesson.subject_id),
    };
  }
}

function lessonLink(lessonId: number, subjectId?: number): string {
  return subjectId
    ? `/student/subjects/${subjectId}/lessons/${lessonId}`
    : `/student/subjects/0/lessons/${lessonId}`;
}
