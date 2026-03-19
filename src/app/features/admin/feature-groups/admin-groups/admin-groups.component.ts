import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
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

  public readonly pageSize = 10;

  private _sort!: MatSort;
  private allGroups: GroupEntity[] = [];
  private totalGroupsCount = 0;
  private sortField: string | null = null;
  private sortOrder: 'asc' | 'desc' = 'asc';

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

  public ngOnInit(): void {
    this.loadGroups(true);
  }

  public loadGroups(resetToFirstPage = false): void {
    if (resetToFirstPage) {
      this.currentPage.set(1);
    }

    this.fetchGroups();
  }

  public onPageChange(event: PageEvent): void {
    const page = event.pageIndex + 1;
    if (page === this.currentPage()) {
      return;
    }

    this.currentPage.set(page);
    this.fetchGroups();
  }

  public onSortChange(sort: Sort): void {
    if (!sort.active || !sort.direction) {
      this.sortField = null;
      this.sortOrder = 'asc';
    } else {
      this.sortField = sort.active;
      this.sortOrder = sort.direction;
    }

    this.currentPage.set(1);
    this.fetchGroups();
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
    this.searchValue.set(value.trim());
    this.currentPage.set(1);
    this.fetchGroups();
  }

  public clearSearch(): void {
    this.searchValue.set('');
    this.currentPage.set(1);
    this.fetchGroups();
  }

  public resetFilters(): void {
    this.searchValue.set('');
    this.currentPage.set(1);
    this.sortField = null;
    this.sortOrder = 'asc';

    if (this._sort) {
      this._sort.active = '';
      this._sort.direction = '';
    }

    this.fetchGroups();
  }

  public get totalGroups(): number {
    return this.totalGroupsCount;
  }

  public get filteredGroupsCount(): number {
    return this.totalGroupsCount;
  }

  private fetchGroups(): void {
    const showBlockingLoader = this.dataSource.data.length === 0;
    if (showBlockingLoader) {
      this.isLoading.set(true);
    }

    this.errorMessage.set('');

    this.groupsService
      .getGroupsPage({
        page: this.currentPage(),
        limit: this.pageSize,
        sortBy: this.sortField ?? undefined,
        order: this.sortOrder,
        filters: this.buildSearchFilters(this.searchValue()),
      })
      .subscribe({
        next: ({ items, total }) => {
          this.allGroups = items;
          this.totalGroupsCount = total;
          this.dataSource.data = items;

          if (showBlockingLoader) {
            this.isLoading.set(false);
          }
        },
        error: (err: unknown) => {
          this.errorMessage.set('Ошибка при загрузке групп.');
          if (showBlockingLoader) {
            this.isLoading.set(false);
          }
          console.error(err);
        },
      });
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

