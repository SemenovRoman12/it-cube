import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { GroupEntity } from '../../../../core/models/group.model';
import { UserEntity } from '../../../../core/models/user.model';
import { ListStateFacade } from '../../shared/list-state';
import { GroupsService } from '../../services/groups.service';
import { UsersService } from '../../services/users.service';
import { UserEditDialogComponent } from '../user-edit-dialog/user-edit-dialog.component';
import { UserCreateDialogComponent } from '../user-create-dialog/user-create-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../../core/ui/components/confirm-dialog/confirm-dialog.component';
import { API_URL } from '../../../../core/http/api-url.token';

const DEFAULT_AVATAR_MOKKY_URL = 'http://mokky.dev/uploaded/dfnhxiq6j/image/upload/v1774430966/file_pacrzh.jpg';

interface UploadEntity {
  id: number;
  url: string;
}

@Component({
  selector: 'app-admin-container-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    TranslateModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly usersService = inject(UsersService);
  private readonly groupsService = inject(GroupsService);
  private readonly dialog = inject(MatDialog);

  private readonly listState = new ListStateFacade<UserEntity, Record<string, string | number>>(
    {
      loadPage: (query) =>
        forkJoin({
          usersPage: this.usersService.getUsersPage(query),
          groups: this.groupsService.getGroups(),
        }).pipe(
          map(({ usersPage, groups }) => {
            const names: Record<number, string> = {};
            groups.forEach((group: GroupEntity) => {
              names[group.id] = group.name;
            });

            this.groupNames.set(names);

            return {
              items: usersPage.items,
              total: usersPage.total,
            };
          })
        ),
    },
    {
      pageSize: 10,
      createFilters: (rawSearch) => this.buildSearchFilters(rawSearch),
      loadingErrorMessage: 'Ошибка при загрузке пользователей.',
    }
  );

  private _sort!: MatSort;

  public readonly pageSize = this.listState.pageSize;

  @ViewChild(MatSort)
  set sort(value: MatSort) {
    if (value) {
      this._sort = value;
      this.dataSource.filterPredicate = (item, filter) => {
        const search = [
          String(item.id),
          item.full_name,
          item.email,
          item.role,
          this.getGroupName(item.group_id),
          this.formatDate(item.created_at),
        ]
          .join(' ')
          .toLowerCase();

        return search.includes(filter);
      };
    }
  }

  public dataSource = new MatTableDataSource<UserEntity>([]);
  public isLoading = signal(false);
  public errorMessage = signal('');
  public searchValue = signal('');
  public deletingUserId = signal<number | null>(null);
  public resettingAvatarUserId = signal<number | null>(null);
  public groupNames = signal<Record<number, string>>({});
  public currentPage = signal(1);

  public displayedColumns = ['id', 'full_name', 'email', 'role', 'group_id', 'created_at', 'actions'];

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
    this.loadUsers(true);
  }

  public loadUsers(resetToFirstPage = false): void {
    this.listState.load(resetToFirstPage);
  }

  public onPageChange(event: PageEvent): void {
    this.listState.onPageChange(event.pageIndex + 1);
  }

  public onSortChange(sort: Sort): void {
    this.listState.onSortChange(sort);
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

  public openEditDialog(user: UserEntity): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      width: '480px',
      data: user,
    });

    dialogRef.afterClosed().subscribe((updatedUser: UserEntity | undefined) => {
      if (updatedUser) {
        this.loadUsers();
      }
    });
  }

  public openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserCreateDialogComponent, {
      width: '480px',
      data: { isAdminFlow: true },
    });

    dialogRef.afterClosed().subscribe((createdUser: UserEntity | undefined) => {
      if (createdUser) {
        this.loadUsers();
      }
    });
  }

  public getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Администратор',
      teacher: 'Учитель',
      user: 'Пользователь',
    };
    return labels[role] ?? role;
  }

  public getRoleColor(role: string): 'primary' | 'accent' | 'warn' {
    const colors: Record<string, 'primary' | 'accent' | 'warn'> = {
      admin: 'warn',
      teacher: 'primary',
      user: 'accent',
    };
    return colors[role] ?? 'primary';
  }

  public hasUserAvatar(user: UserEntity): boolean {
    return Boolean(user.avatar_url?.trim());
  }

  public getUserAvatarUrl(user: UserEntity): string {
    return user.avatar_url?.trim() ?? '';
  }

  public getUserInitials(user: UserEntity): string {
    const fullName = user.full_name?.trim();

    if (!fullName) {
      return user.email.slice(0, 2).toUpperCase();
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  public onUserAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (!image) {
      return;
    }

    image.style.display = 'none';
  }

  public formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  public get totalUsers(): number {
    return this.listState.total;
  }

  public get filteredUsers(): number {
    return this.listState.total;
  }

  public get hasMoreUsers(): boolean {
    return this.listState.hasMore;
  }

  public get totalPages(): number {
    return this.listState.totalPages;
  }

  public loadMoreUsers(): void {
    this.listState.loadMore();
  }

  public getGroupName(groupId: number | null): string {
    if (groupId == null) {
      return 'Без группы';
    }

    return this.groupNames()[groupId] ?? `Группа #${groupId}`;
  }

  public deleteUser(user: UserEntity): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Удаление пользователя',
        message: `Вы действительно хотите удалить пользователя ${user.email}?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        variant: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.performDeleteUser(user);
    });
  }

  public resetUserAvatar(user: UserEntity): void {
    if (!this.hasUserAvatar(user)) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Сброс аватара',
        message: `Сбросить аватар пользователя ${user.email}?`,
        confirmText: 'Сбросить',
        cancelText: 'Отмена',
        variant: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.performResetUserAvatar(user);
    });
  }

  private performDeleteUser(user: UserEntity): void {
    this.deletingUserId.set(user.id);

    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.deletingUserId.set(null);
        this.loadUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении пользователя. Попробуйте снова.');
        this.deletingUserId.set(null);
        console.error(err);
      },
    });
  }

  private performResetUserAvatar(user: UserEntity): void {
    const avatarUrl = user.avatar_url?.trim() ?? null;

    this.resettingAvatarUserId.set(user.id);

    this.resolveUploadIdByUrl(avatarUrl)
      .pipe(
        switchMap((uploadId) => this.deleteUploadIfExists(uploadId)),
        switchMap(() => this.usersService.updateUser(user.id, { avatar_url: null })),
      )
      .subscribe({
        next: () => {
          this.resettingAvatarUserId.set(null);
          this.loadUsers();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set('Ошибка при сбросе аватара пользователя. Попробуйте снова.');
          this.resettingAvatarUserId.set(null);
          console.error(err);
        },
      });
  }

  private resolveUploadIdByUrl(url: string | null): Observable<number | null> {
    if (!url || url === DEFAULT_AVATAR_MOKKY_URL) {
      return of(null);
    }

    const params = new HttpParams().set('url', url);

    return this.http.get<UploadEntity[]>(`${this.apiUrl}/uploads`, { params }).pipe(
      map((items) => items?.[0]?.id ?? null),
      catchError(() => of(null)),
    );
  }

  private deleteUploadIfExists(uploadId: number | null): Observable<unknown> {
    if (!uploadId) {
      return of(null);
    }

    return this.http.delete(`${this.apiUrl}/uploads/${uploadId}`).pipe(catchError(() => of(null)));
  }

  private buildSearchFilters(rawSearch: string): Record<string, string | number> {
    const search = rawSearch.trim();
    if (!search) {
      return {};
    }

    const lower = search.toLowerCase();

    if (lower.includes('@')) {
      return { email: `*${search}` };
    }

    if (['admin', 'teacher', 'user'].includes(lower)) {
      return { role: lower };
    }

    if (/^\d+$/.test(search)) {
      return { group_id: Number(search) };
    }

    return { full_name: `*${search}` };
  }
}

