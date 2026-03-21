import { signal } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { ListAdapter, ListStateConfig, ListUiSort } from './list-state.models';

export class ListStateFacade<TItem, TFilters> {
  private readonly adapter: ListAdapter<TItem, TFilters>;
  private readonly config: ListStateConfig<TFilters>;

  private loadedExtraPages = 0;
  private allItems: TItem[] = [];
  private totalCount = 0;
  private sortField: string | null = null;
  private sortOrder: 'asc' | 'desc';

  public readonly isLoading = signal(false);
  public readonly errorMessage = signal('');
  public readonly searchValue = signal('');
  public readonly currentPage = signal(1);

  public readonly data = signal<TItem[]>([]);

  public constructor(adapter: ListAdapter<TItem, TFilters>, config: ListStateConfig<TFilters>) {
    this.adapter = adapter;
    this.config = config;
    this.sortOrder = config.defaultSortOrder ?? 'asc';
  }

  public get pageSize(): number {
    return this.config.pageSize;
  }

  public get total(): number {
    return this.totalCount;
  }

  public get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  public get hasMore(): boolean {
    return this.currentPage() + this.loadedExtraPages < this.totalPages;
  }

  public load(resetToFirstPage = false): void {
    if (resetToFirstPage) {
      this.currentPage.set(1);
      this.loadedExtraPages = 0;
    }

    this.fetchPage(false);
  }

  public reload(): void {
    this.fetchPage(false);
  }

  public onPageChange(nextPage: number): void {
    if (nextPage === this.currentPage()) {
      return;
    }

    this.currentPage.set(nextPage);
    this.loadedExtraPages = 0;
    this.fetchPage(false);
  }

  public onSortChange(sort: Sort): void {
    if (!sort.active || !sort.direction) {
      this.sortField = null;
      this.sortOrder = this.config.defaultSortOrder ?? 'asc';
    } else {
      this.sortField = sort.active;
      this.sortOrder = sort.direction;
    }

    this.currentPage.set(1);
    this.loadedExtraPages = 0;
    this.fetchPage(false);
  }

  public applyFilter(value: string): void {
    this.searchValue.set(value.trim());
    this.currentPage.set(1);
    this.loadedExtraPages = 0;
    this.fetchPage(false);
  }

  public clearSearch(): void {
    this.searchValue.set('');
    this.currentPage.set(1);
    this.loadedExtraPages = 0;
    this.fetchPage(false);
  }

  public resetFilters(): void {
    this.searchValue.set('');
    this.currentPage.set(1);
    this.loadedExtraPages = 0;
    this.sortField = null;
    this.sortOrder = this.config.defaultSortOrder ?? 'asc';
    this.fetchPage(false);
  }

  public loadMore(): void {
    if (!this.hasMore) {
      return;
    }

    this.loadedExtraPages += 1;
    this.fetchPage(true);
  }

  public getUiSort(): ListUiSort {
    return {
      active: this.sortField ?? '',
      direction: this.sortField ? this.sortOrder : '',
    };
  }

  private fetchPage(append: boolean): void {
    const showBlockingLoader = !append && this.data().length === 0;
    if (showBlockingLoader) {
      this.isLoading.set(true);
    }

    this.errorMessage.set('');

    const query = {
      page: this.currentPage() + this.loadedExtraPages,
      limit: this.pageSize,
      sortBy: this.sortField ?? undefined,
      order: this.sortOrder,
      filters: this.config.createFilters(this.searchValue()),
    };

    this.adapter.loadPage(query).subscribe({
      next: ({ items, total }) => {
        this.allItems = append ? [...this.allItems, ...items] : items;
        this.totalCount = total;
        this.data.set(this.allItems);

        if (showBlockingLoader) {
          this.isLoading.set(false);
        }
      },
      error: (err: unknown) => {
        this.errorMessage.set(this.config.loadingErrorMessage);
        if (showBlockingLoader) {
          this.isLoading.set(false);
        }
        console.error(err);
      },
    });
  }
}

