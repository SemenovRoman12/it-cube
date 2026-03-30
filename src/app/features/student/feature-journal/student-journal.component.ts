import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { UserEntity } from '../../../core/models/user.model';
import { StudentJournalSubjectVm } from '../models/student-journal-subject.model';
import { StudentJournalService } from '../services/student-journal.service';
import { MarkValue } from '../../teacher/models/journal-entry.model';

@Component({
  selector: 'student-journal',
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    TranslateModule,
    DatePipe,
  ],
  templateUrl: './student-journal.component.html',
  styleUrl: './student-journal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentJournalComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly studentJournalService = inject(StudentJournalService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly user = this.authService.user() as UserEntity | null;
  public readonly subjects = signal<StudentJournalSubjectVm[]>([]);
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly displayedColumns = ['date', 'topic', 'mark', 'attendance', 'comment'];

  public readonly totalSubjects = computed(() => this.subjects().length);
  public readonly totalMarks = computed(() =>
    this.subjects().reduce((acc, subject) => acc + subject.marksCount, 0),
  );
  public readonly overallAverage = computed(() => {
    const marks = this.subjects().flatMap((subject) =>
      subject.marks.map((item) => item.mark).filter((mark): mark is MarkValue => mark != null),
    );

    return marks.length ? marks.reduce((acc, current) => acc + current, 0) / marks.length : null;
  });

  public ngOnInit(): void {
    this.loadJournal();
  }

  public loadJournal(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.studentJournalService
      .getStudentJournal(this.user)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (journal) => {
          this.subjects.set(journal.subjects);
          this.isLoading.set(false);
        },
        error: () => {
          this.subjects.set([]);
          this.error.set('Не удалось загрузить журнал ученика.');
          this.isLoading.set(false);
        },
      });
  }

  public formatAverage(value: number | null): string {
    return typeof value === 'number' ? value.toFixed(2) : '—';
  }

  public formatAttendance(attendance: string): string {
    switch (attendance) {
      case 'absent':
        return 'Н';
      case 'late':
        return 'Опоздание';
      case 'excused':
        return 'Уваж.';
      default:
        return 'Присутствовал';
    }
  }

  public trackBySubject(_index: number, subject: StudentJournalSubjectVm): number {
    return subject.subjectId;
  }
}
