import { Sort } from '@angular/material/sort';
import { Observable } from 'rxjs';

export type ListSortOrder = 'asc' | 'desc';

export interface ListQuery<TFilters> {
  page: number;
  limit: number;
  sortBy?: string;
  order: ListSortOrder;
  filters: TFilters;
}

export interface ListPageResult<TItem> {
  items: TItem[];
  total: number;
}

export interface ListAdapter<TItem, TFilters> {
  loadPage(query: ListQuery<TFilters>): Observable<ListPageResult<TItem>>;
}

export interface ListStateConfig<TFilters> {
  pageSize: number;
  createFilters(rawSearch: string): TFilters;
  defaultSortOrder?: ListSortOrder;
  loadingErrorMessage: string;
}

export interface ListUiSort {
  active: string;
  direction: Sort['direction'];
}

