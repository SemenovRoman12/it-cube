import { ChangeDetectionStrategy, Component, computed, OnInit, inject, signal } from '@angular/core';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
type SubjectPreferences = {
  favoriteSubjectIds?: number[];
  hiddenSubjectIds?: number[];
};

const DEFAULT_SORT_FIELD: SubjectSortField = 'subject_name';
const DEFAULT_SORT_DIRECTION: SubjectSortDirection = 'asc';
const STORAGE_NAMESPACE = 'student-subjects-preferences';

@Component({
  selector: 'student-subjects-list',
  imports: [
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
  public readonly hasSearchValue = computed(() => this.searchValue().trim().length > 0);
  public readonly favoriteSubjectIds = signal<Set<number>>(new Set<number>());
  public readonly hiddenSubjectIds = signal<Set<number>>(new Set<number>());
  public readonly showHiddenSubjects = signal(false);
  public readonly showOnlyFavorites = signal(false);
  public readonly visibleSubjects = computed(() => {
    const favorites = this.favoriteSubjectIds();
    const hidden = this.hiddenSubjectIds();
    const showHidden = this.showHiddenSubjects();
    const onlyFavorites = this.showOnlyFavorites();

    return [...this.subjects()]
      .filter((subject) => showHidden || !hidden.has(subject.id))
      .filter((subject) => !onlyFavorites || favorites.has(subject.id))
      .sort((left, right) => {
        const leftHidden = hidden.has(left.id);
        const rightHidden = hidden.has(right.id);
        const leftFavorite = favorites.has(left.id);
        const rightFavorite = favorites.has(right.id);

        if (leftHidden !== rightHidden) {
          return leftHidden ? 1 : -1;
        }

        if (leftFavorite === rightFavorite) {
          return 0;
        }

        return leftFavorite ? -1 : 1;
      });
  });
  public readonly trackBySubject = (_index: number, subject: StudentSubjectEntity): number => subject.id;

  public ngOnInit(): void {
    if (!this.hasGroup) {
      return;
    }

    this.restorePreferences();
    this.listState.load();
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

  public clearSearch(): void {
    this.listState.clearSearch();
  }

  public setSearchValue(value: string): void {
    this.listState.applyFilter(value);
  }

  public isFavorite(subjectId: number): boolean {
    return this.favoriteSubjectIds().has(subjectId);
  }

  public isHidden(subjectId: number): boolean {
    return this.hiddenSubjectIds().has(subjectId);
  }

  public toggleFavorite(subjectId: number): void {
    this.favoriteSubjectIds.update((current) => {
      const next = new Set(current);

      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }

      return next;
    });

    this.persistPreferences();
  }

  public hideSubject(subjectId: number): void {
    this.hiddenSubjectIds.update((current) => {
      const next = new Set(current);
      next.add(subjectId);
      return next;
    });

    this.favoriteSubjectIds.update((current) => {
      if (!current.has(subjectId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(subjectId);
      return next;
    });

    this.persistPreferences();
  }

  public restoreHiddenSubject(subjectId: number): void {
    this.hiddenSubjectIds.update((current) => {
      if (!current.has(subjectId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(subjectId);
      return next;
    });

    this.persistPreferences();
  }

  public toggleHiddenSubjectsVisibility(): void {
    this.showHiddenSubjects.update((current) => !current);
  }

  public toggleOnlyFavorites(): void {
    this.showOnlyFavorites.update((current) => !current);
  }

  public loadMoreSubjects(): void {
    this.listState.loadMore();
  }

  public get totalSubjects(): number {
    return this.listState.total;
  }

  public get hasMoreSubjects(): boolean {
    return this.listState.hasMore;
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
      sortBy: DEFAULT_SORT_FIELD,
      order: DEFAULT_SORT_DIRECTION,
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

  private restorePreferences(): void {
    const storageKey = this.getStorageKey();

    if (!storageKey) {
      return;
    }

    try {
      const rawValue = localStorage.getItem(storageKey);

      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as SubjectPreferences;

      this.favoriteSubjectIds.set(new Set(parsed.favoriteSubjectIds ?? []));
      this.hiddenSubjectIds.set(new Set(parsed.hiddenSubjectIds ?? []));
    } catch {
      this.resetPreferences();
    }
  }

  private persistPreferences(): void {
    const storageKey = this.getStorageKey();

    if (!storageKey) {
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        favoriteSubjectIds: [...this.favoriteSubjectIds()],
        hiddenSubjectIds: [...this.hiddenSubjectIds()],
      }),
    );
  }

  private getStorageKey(): string | null {
    const userId = this.user?.id;

    if (!userId) {
      return null;
    }

    return `${STORAGE_NAMESPACE}:${userId}`;
  }

  private resetPreferences(): void {
    this.favoriteSubjectIds.set(new Set<number>());
    this.hiddenSubjectIds.set(new Set<number>());
  }
}

