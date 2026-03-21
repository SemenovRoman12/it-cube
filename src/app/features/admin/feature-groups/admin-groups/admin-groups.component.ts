import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { GroupEntity } from '../../../../core/models/group.model';
import { ListStateFacade } from '../../shared/list-state';
import { GroupsService } from '../../services/groups.service';
import { GroupCreateDialogComponent } from '../group-create-dialog/group-create-dialog.component';
import { GroupEditDialogComponent } from '../group-edit-dialog/group-edit-dialog.component';

@Component({
  selector: 'app-admin-container-groups',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './admin-groups.component.html',
  styleUrl: './admin-groups.component.scss',
})
export class AdminGroupsComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private readonly listState = new ListStateFacade<GroupEntity, Record<string, string | number>>(
    {
      loadPage: (query) => this.groupsService.getGroupsPage(query),
    },
    {
      pageSize: 10,
      createFilters: (rawSearch) => this.buildSearchFilters(rawSearch),
      loadingErrorMessage: 'Ошибка при загрузке групп.',
    }
  );

  private _sort!: MatSort;

  public readonly pageSize = this.listState.pageSize;

  @ViewChild(MatSort)
  set sort(value: MatSort) {
    if (value) {
      this._sort = value;
    }
  }

  public readonly isLoading = signal(false);
  public readonly errorMessage = signal('');
  public readonly searchValue = signal('');
  public readonly deletingGroupId = signal<number | null>(null);
  public readonly currentPage = signal(1);

  public readonly dataSource = new MatTableDataSource<GroupEntity>([]);
  public readonly displayedColumns = ['id', 'name', 'actions'];

  public constructor() {
    this.isLoading = this.listState.isLoading;
    this.errorMessage = this.listState.errorMessage;
    this.searchValue = this.listState.searchValue;
    this.currentPage = this.listState.currentPage;

    effect(() => {
      this.dataSource.data = this.listState.data();
    });
  }

  public ngOnInit(): void {
    this.loadGroups(true);
  }

  public loadGroups(resetToFirstPage = false): void {
    this.listState.load(resetToFirstPage);
  }

  public onPageChange(event: PageEvent): void {
    this.listState.onPageChange(event.pageIndex + 1);
  }

  public onSortChange(sort: Sort): void {
    this.listState.onSortChange(sort);
  }

  public openCreateDialog(): void {
    const dialogRef = this.dialog.open(GroupCreateDialogComponent, {
      width: '460px',
    });

    dialogRef.afterClosed().subscribe((createdGroup: GroupEntity | undefined) => {
      if (createdGroup) {
        this.loadGroups();
      }
    });
  }

  public openEditDialog(group: GroupEntity): void {
    const dialogRef = this.dialog.open(GroupEditDialogComponent, {
      width: '460px',
      data: group,
    });

    dialogRef.afterClosed().subscribe((updatedGroup: GroupEntity | undefined) => {
      if (updatedGroup) {
        this.loadGroups();
      }
    });
  }

  public openGroup(groupId: number): void {
    this.router.navigate(['/admin/groups', groupId]);
  }

  public deleteGroup(group: GroupEntity): void {
    const isConfirmed = window.confirm(`Удалить группу ${group.name}?`);
    if (!isConfirmed) {
      return;
    }

    this.deletingGroupId.set(group.id);

    this.groupsService.deleteGroup(group.id).subscribe({
      next: () => {
        this.deletingGroupId.set(null);
        this.loadGroups();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении группы. Попробуйте снова.');
        this.deletingGroupId.set(null);
        console.error(err);
      },
    });
  }

  public applyFilter(value: string): void {
    this.listState.applyFilter(value);
  }

  public clearSearch(): void {
    this.listState.clearSearch();
  }

  public resetFilters(): void {
    this.listState.resetFilters();

    if (this._sort) {
      const uiSort = this.listState.getUiSort();
      this._sort.active = uiSort.active;
      this._sort.direction = uiSort.direction;
    }
  }

  public get totalGroups(): number {
    return this.listState.total;
  }

  public get filteredGroupsCount(): number {
    return this.listState.total;
  }

  public get hasMoreGroups(): boolean {
    return this.listState.hasMore;
  }

  public get totalPages(): number {
    return this.listState.totalPages;
  }

  public loadMoreGroups(): void {
    this.listState.loadMore();
  }

  private buildSearchFilters(rawSearch: string): Record<string, string | number> {
    const search = rawSearch.trim();
    if (!search) {
      return {};
    }

    if (/^\d+$/.test(search)) {
      return { id: Number(search) };
    }

    return { name: `*${search}` };
  }
}

