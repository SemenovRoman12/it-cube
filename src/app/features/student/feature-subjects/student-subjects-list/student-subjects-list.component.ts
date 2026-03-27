import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserEntity } from '../../../../core/models/user.model';
import { StudentSubjectEntity } from '../../models/student-subject.model';
import { StudentSubjectsPageQuery, StudentSubjectsService } from '../../services/student-subjects.service';
import { ListQuery, ListStateFacade } from '../../../admin/shared/list-state';
import { StudentSubjectCardComponent } from '../student-subject-card/student-subject-card.component';

type SubjectSortField = 'subject_name' | 'subject_id';
type SubjectSortDirection = 'asc' | 'desc';

const DEFAULT_SORT_FIELD: SubjectSortField = 'subject_name';
const DEFAULT_SORT_DIRECTION: SubjectSortDirection = 'asc';

@Component({
  selector: 'student-subjects-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatTooltipModule,
    StudentSubjectCardComponent,
    TranslateModule,
  ],
  templateUrl: './student-subjects-list.component.html',
  styleUrl: './student-subjects-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSubjectsListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly studentSubjectsService = inject(StudentSubjectsService);
  private readonly translate = inject(TranslateService);

  public readonly user = this.authService.user() as UserEntity | null;
  public readonly sortField = signal<SubjectSortField>(DEFAULT_SORT_FIELD);
  public readonly sortDirection = signal<SubjectSortDirection>(DEFAULT_SORT_DIRECTION);

  private readonly listState = new ListStateFacade<StudentSubjectEntity, Record<string, string | number>>(
    {
      loadPage: (query) => this.getSubjectsPage(query),
    },
    {
      pageSize: 9,
      createFilters: (rawSearch) => this.buildSearchFilters(rawSearch),
      loadingErrorMessage: this.translate.instant('STUDENT.SUBJECTS.ERROR_LOAD'),
    },
  );

  public readonly pageSize = this.listState.pageSize;
  public readonly isLoading = this.listState.isLoading;
  public readonly errorMessage = this.listState.errorMessage;
  public readonly searchValue = this.listState.searchValue;
  public readonly currentPage = this.listState.currentPage;
  public readonly subjects = this.listState.data;
  public readonly hasGroup = Boolean(this.user?.group_id);
  public readonly trackBySubject = (_index: number, subject: StudentSubjectEntity): number => subject.id;

  public ngOnInit(): void {
    if (!this.hasGroup) {
      return;
    }

    this.applySort();
  }

  public loadSubjects(resetToFirstPage = false): void {
    if (!this.hasGroup) {
      return;
    }

    if (resetToFirstPage) {
      this.listState.load(true);
      return;
    }

    this.listState.reload();
  }

  public onPageChange(event: PageEvent): void {
    this.listState.onPageChange(event.pageIndex + 1);
  }

  public applyFilter(value: string): void {
    this.listState.applyFilter(value);
  }

  public clearSearch(): void {
    this.listState.clearSearch();
  }

  public resetFilters(): void {
    if (!this.hasGroup) {
      return;
    }

    this.searchValue.set('');
    this.sortField.set(DEFAULT_SORT_FIELD);
    this.sortDirection.set(DEFAULT_SORT_DIRECTION);
    this.applySort();
  }

  public setSortField(field: SubjectSortField): void {
    this.sortField.set(field);
    this.applySort();
  }

  public toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    this.applySort();
  }

  public loadMoreSubjects(): void {
    this.listState.loadMore();
  }

  public get totalSubjects(): number {
    return this.listState.total;
  }

  public get filteredSubjectsCount(): number {
    return this.listState.total;
  }

  public get hasMoreSubjects(): boolean {
    return this.listState.hasMore;
  }

  private applySort(): void {
    const sort: Sort = {
      active: this.sortField(),
      direction: this.sortDirection(),
    };

    this.listState.onSortChange(sort);
  }

  private getSubjectsPage(query: ListQuery<Record<string, string | number>>): Observable<{ items: StudentSubjectEntity[]; total: number }> {
    const groupId = this.user?.group_id;

    if (!groupId) {
      return of({ items: [], total: 0 });
    }

    const pageQuery: StudentSubjectsPageQuery = {
      page: query.page,
      limit: query.limit,
      groupId,
      sortBy: query.sortBy as 'subject_id' | 'subject_name' | undefined,
      order: query.order,
      filters: query.filters,
    };

    return this.studentSubjectsService.getSubjectsPage(pageQuery);
  }

  private buildSearchFilters(rawSearch: string): Record<string, string | number> {
    const search = rawSearch.trim();
    if (!search) {
      return {};
    }

    if (/^\d+$/.test(search)) {
      return { subject_id: Number(search) };
    }

    return { subject_name: `*${search}` };
  }
}

