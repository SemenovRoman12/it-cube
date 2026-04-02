import { CommonModule, DatePipe } from '@angular/common';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LessonFileEntity } from '../../../core/models/lesson-file.model';
import { FileStorageService } from '../../../core/services/file-storage.service';
import { LessonSubmissionEntity } from '../../../core/models/lesson-submission.model';
import { LessonSubmissionMemberEntity } from '../../../core/models/lesson-submission-member.model';
import { ConfirmDialogComponent } from '../../../core/ui/components/confirm-dialog/confirm-dialog.component';
import { UserEntity } from '../../../core/models/user.model';
import { StudentLessonEntity } from '../models/student-lesson.model';
import { StudentSubjectsService } from '../services/student-subjects.service';

@Component({
  selector: 'student-lesson-details',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressBarModule,
    TranslateModule,
    DatePipe,
  ],
  templateUrl: './student-lesson-details.component.html',
  styleUrl: './student-lesson-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLessonDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly studentSubjectsService = inject(StudentSubjectsService);
  private readonly fileStorage = inject(FileStorageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  public readonly user = this.authService.user() as UserEntity | null;
  public readonly lesson = signal<StudentLessonEntity | null>(null);
  public readonly submission = signal<LessonSubmissionEntity | null>(null);
  public readonly members = signal<LessonSubmissionMemberEntity[]>([]);
  public readonly classmates = signal<UserEntity[]>([]);
  public readonly assignmentFiles = signal<LessonFileEntity[]>([]);
  public readonly submissionFiles = signal<LessonFileEntity[]>([]);
  public readonly pendingFiles = signal<File[]>([]);
  public readonly isLoading = signal(false);
  public readonly isSaving = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  public readonly collaborationHelpTooltip = [
    '1. Выберите одногруппников.',
    '2. Сохраните ответ.',
    '3. Приглашение отправится автоматически.',
    '4. После принятия вы будете работать с одним общим ответом.',
  ].join('\n');

  public readonly form = this.formBuilder.group({
    answer_text: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    invited_student_ids: this.formBuilder.nonNullable.control<number[]>([]),
  });

  public readonly currentMember = computed(() => {
    const studentId = this.user?.id ?? null;
    if (!studentId) {
      return null;
    }

    return this.members().find((member) => member.student_id === studentId && member.status !== 'declined') ?? null;
  });

  public readonly acceptedMembers = computed(() => this.members().filter((member) => member.status === 'accepted'));
  public readonly invitedMembers = computed(() => this.members().filter((member) => member.status === 'invited'));
  public readonly canEdit = computed(() => {
    const currentMember = this.currentMember();
    const submission = this.submission();

    if (!submission) {
      return true;
    }

    return currentMember?.status === 'accepted' && submission?.mark == null;
  });

  public readonly canManageMembers = computed(() => {
    const currentMember = this.currentMember();
    const submission = this.submission();

    if (!submission) {
      return true;
    }

    return currentMember?.role === 'creator' && currentMember.status === 'accepted' && submission?.mark == null;
  });

  public readonly availableClassmates = computed(() => {
    const occupiedIds = new Set(this.members().map((member) => member.student_id));
    const currentUserId = this.user?.id ?? null;

    return this.classmates().filter((student) => student.id !== currentUserId && !occupiedIds.has(student.id));
  });

  public readonly canLeaveSubmission = computed(() => {
    const currentMember = this.currentMember();
    const submission = this.submission();

    if (!currentMember || !submission || currentMember.status !== 'accepted' || submission.mark != null) {
      return false;
    }

    if (currentMember.role !== 'creator') {
      return true;
    }

    return this.acceptedMembers().length === 1;
  });

  public readonly status = computed(() => {
    const submission = this.submission();
    if (submission?.status === 'submitted') {
      return 'submitted';
    }

    if (submission?.status === 'overdue') {
      return 'overdue';
    }

    const dueAt = this.lesson()?.due_at;
    if (!dueAt) {
      return 'pending';
    }

    return new Date(dueAt).getTime() < Date.now() ? 'overdue' : 'pending';
  });

  public readonly canManageFiles = computed(() => this.canEdit());

  public getLessonTitle(lesson: StudentLessonEntity): string {
    return (lesson as StudentLessonEntity & { title?: string }).title || lesson.topic;
  }

  public getLessonDescription(lesson: StudentLessonEntity): string {
    return (lesson as StudentLessonEntity & { description?: string }).description || lesson.topic;
  }

  public getLessonDueAt(lesson: StudentLessonEntity): string | null {
    return (lesson as StudentLessonEntity & { due_at?: string }).due_at ?? null;
  }

  public ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());
  }

  public onSubmit(): void {
    const lesson = this.lesson();
    const student = this.user;
    if (!lesson || !student) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dueAt = lesson.due_at;
    const status = dueAt && new Date(dueAt).getTime() < Date.now() ? 'overdue' : 'submitted';

    const invalidFile = this.pendingFiles().map((file) => this.fileStorage.validateFile(file)).find((message) => !!message);
    if (invalidFile) {
      this.error.set(invalidFile);
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.saveSubmission(lesson, student, status)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось отправить ответ.');
          return of(null);
        }),
      )
      .subscribe((saved) => {
        if (!saved) {
          return;
        }

        this.submission.set(saved);
        this.form.controls.invited_student_ids.setValue([]);
        this.success.set('Ответ сохранён.');
        this.reloadSubmissionContext();
      });
  }

  public getStudentName(studentId: number): string {
    return this.classmates().find((student) => student.id === studentId)?.full_name
      ?? (this.user?.id === studentId ? this.user.full_name : `ID ${studentId}`);
  }

  public onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nextFiles = Array.from(input.files ?? []);
    this.pendingFiles.set([...this.pendingFiles(), ...nextFiles]);
  }

  public removePendingFile(index: number): void {
    this.pendingFiles.set(this.pendingFiles().filter((_, currentIndex) => currentIndex !== index));
  }

  public removeUploadedFile(file: LessonFileEntity): void {
    if (!this.canManageFiles()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.studentSubjectsService.removeLessonFile(file)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось удалить файл ответа.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result === null) {
          return;
        }

        this.submissionFiles.set(this.submissionFiles().filter((item) => item.id !== file.id));
        this.success.set('Файл ответа удалён.');
      });
  }

  public canRemoveMember(member: LessonSubmissionMemberEntity): boolean {
    const currentMember = this.currentMember();

    return !!currentMember
      && currentMember.role === 'creator'
      && currentMember.status === 'accepted'
      && member.student_id !== currentMember.student_id
      && member.role !== 'creator'
      && this.submission()?.mark == null;
  }

  public confirmRemoveMember(member: LessonSubmissionMemberEntity): void {
    const studentName = this.getStudentName(member.student_id);

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Удалить участника',
        message: `Вы уверены, что хотите удалить ${studentName} из совместного ответа?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        variant: 'warn',
      },
    }).afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.removeMember(member);
      });
  }

  public acceptInvitation(): void {
    const currentMember = this.currentMember();
    const submission = this.submission();
    const student = this.user;

    if (!currentMember || !submission || !student || currentMember.status !== 'invited' || submission.mark != null) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.studentSubjectsService
      .acceptInvitationAndNotify(lessonToStudentLesson(submission, this.lesson()), submission, currentMember.id, student)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось принять приглашение.');
          return of(null);
        }),
      )
      .subscribe((member) => {
        if (!member) {
          return;
        }

        this.success.set('Вы присоединились к совместному ответу.');
        this.reloadSubmissionContext();
      });
  }

  public declineInvitation(): void {
    const currentMember = this.currentMember();
    const submission = this.submission();
    const student = this.user;

    if (!currentMember || !submission || !student || currentMember.status !== 'invited' || submission.mark != null) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.studentSubjectsService
      .declineInvitationAndNotify(lessonToStudentLesson(submission, this.lesson()), submission, currentMember.id, student)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось отклонить приглашение.');
          return of(null);
        }),
      )
      .subscribe((member) => {
        if (!member) {
          return;
        }

        this.submission.set(null);
        this.form.patchValue({ answer_text: '' });
        this.success.set('Приглашение отклонено.');
        this.reloadSubmissionContext();
      });
  }

  public leaveSubmission(): void {
    const currentMember = this.currentMember();
    const submission = this.submission();
    const student = this.user;

    if (!currentMember || !submission || !student || !this.canLeaveSubmission()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.studentSubjectsService
      .leaveSubmissionAndNotify(lessonToStudentLesson(submission, this.lesson()), submission, currentMember.id, student)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось выйти из команды.');
          return of(null);
        }),
      )
      .subscribe((member) => {
        if (!member) {
          return;
        }

        this.submission.set(null);
        this.form.patchValue({ answer_text: '' });
        this.success.set('Вы вышли из совместного ответа.');
        this.reloadSubmissionContext();
      });
  }

  private removeMember(member: LessonSubmissionMemberEntity): void {
    const submission = this.submission();
    const student = this.user;

    if (!submission || !student || !this.canRemoveMember(member)) {
      return;
    }

    const studentName = this.getStudentName(member.student_id);

    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.studentSubjectsService
      .removeMemberAndNotify(lessonToStudentLesson(submission, this.lesson()), submission, member)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        catchError(() => {
          this.error.set('Не удалось удалить участника.');
          return of(null);
        }),
      )
      .subscribe((updatedMember) => {
        if (!updatedMember) {
          return;
        }

        this.success.set(`Участник ${studentName} удалён из совместного ответа.`);
        this.reloadSubmissionContext();
      });
  }

  private loadData(): void {
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    const student = this.user;

    this.lesson.set(null);
    this.submission.set(null);
    this.success.set(null);
    this.pendingFiles.set([]);
    this.assignmentFiles.set([]);
    this.submissionFiles.set([]);

    if (!Number.isFinite(lessonId) || !student) {
      this.error.set('Некорректные параметры страницы.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      lesson: this.studentSubjectsService.getLessonById(lessonId),
      submissionContext: this.studentSubjectsService.getSubmissionContext(lessonId, student.id),
      classmates: this.studentSubjectsService.getGroupStudents(student.group_id ?? 0),
      assignmentFiles: this.studentSubjectsService.getLessonFilesByLesson(lessonId),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.error.set('Не удалось загрузить данные задания.');
          return of({ lesson: null, submissionContext: null, classmates: [] as UserEntity[], assignmentFiles: [] as LessonFileEntity[] });
        }),
      )
      .subscribe(({ lesson, submissionContext, classmates, assignmentFiles }) => {
        if (!lesson) {
          this.error.set('Задание не найдено.');
          return;
        }

        this.lesson.set(lesson);
        this.classmates.set(classmates);
        this.assignmentFiles.set(assignmentFiles);
        this.submission.set(submissionContext?.submission ?? null);
        this.members.set(submissionContext?.members ?? []);
        this.form.patchValue({ answer_text: submissionContext?.submission?.answer_text ?? '' });

        if (submissionContext?.submission?.id) {
          this.studentSubjectsService.getLessonFilesBySubmission(submissionContext.submission.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((files) => this.submissionFiles.set(files));
        }
      });
  }

  private saveSubmission(lesson: StudentLessonEntity, student: UserEntity, status: LessonSubmissionEntity['status']) {
    const answerText = this.form.controls.answer_text.value.trim();
    const invitedStudentIds = this.form.controls.invited_student_ids.value;

    return this.studentSubjectsService.saveAnswerAndInvite(lesson, student, answerText, status, invitedStudentIds).pipe(
      switchMap((savedSubmission) => {
        const files = this.pendingFiles();
        if (!files.length) {
          return of(savedSubmission);
        }

        return this.studentSubjectsService.saveSubmissionFiles(lesson.id, savedSubmission.id, student.id, files).pipe(
          map((savedFiles) => {
            this.submissionFiles.set([...this.submissionFiles(), ...savedFiles]);
            this.pendingFiles.set([]);
            return savedSubmission;
          }),
        );
      }),
    );
  }

  private reloadSubmissionContext(): void {
    const lesson = this.lesson();
    const student = this.user;

    if (!lesson || !student) {
      return;
    }

    this.studentSubjectsService
      .getSubmissionContext(lesson.id, student.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((context) => {
        this.submission.set(context?.submission ?? null);
        this.members.set(context?.members ?? []);
        this.form.patchValue({ answer_text: context?.submission?.answer_text ?? this.form.controls.answer_text.value });

        if (!context?.submission?.id) {
          this.submissionFiles.set([]);
          return;
        }

        this.studentSubjectsService.getLessonFilesBySubmission(context.submission.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((files) => this.submissionFiles.set(files));
      });
  }
}

function lessonToStudentLesson(
  submission: LessonSubmissionEntity,
  lesson: StudentLessonEntity | null,
): StudentLessonEntity {
  return lesson ?? {
    id: submission.lesson_id,
    teacher_id: 0,
    group_id: 0,
    subject_id: 0,
    date: '',
    topic: '',
  };
}
