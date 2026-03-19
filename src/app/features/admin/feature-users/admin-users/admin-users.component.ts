import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
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
import { GroupsService } from '../../services/groups.service';
import { UsersService } from '../../services/users.service';
import { UserEditDialogComponent } from '../user-edit-dialog/user-edit-dialog.component';
import { UserCreateDialogComponent } from '../user-create-dialog/user-create-dialog.component';

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
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly groupsService = inject(GroupsService);
  private readonly dialog = inject(MatDialog);

  public readonly pageSize = 20;

  private _sort!: MatSort;
  private loadedExtraPages = 0;
  private allUsers: UserEntity[] = [];
  private totalUsersCount = 0;
  private sortField = 'id';
  private sortOrder: 'asc' | 'desc' = 'asc';

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
  public groupNames = signal<Record<number, string>>({});
  public currentPage = signal(1);

  public displayedColumns = ['id', 'full_name', 'email', 'role', 'group_id', 'created_at', 'actions'];

  public ngOnInit(): void {
    this.loadUsers(true);
  }

  public loadUsers(resetToFirstPage = false): void {
    if (resetToFirstPage) {
      this.currentPage.set(1);
      this.loadedExtraPages = 0;
    }

    this.fetchUsers(false);
  }

  public onPageChange(event: PageEvent): void {
    const page = event.pageIndex + 1;

    if (page === this.currentPage()) {
      return;
    }

    this.currentPage.set(page);
    this.loadedExtraPages = 0;
    this.fetchUsers(false);
  }

  public onSortChange(sort: Sort): void {
    if (!sort.active || !sort.direction) {
      this.sortField = 'id';
      this.sortOrder = 'asc';
    } else {
      this.sortField = sort.active;
      this.sortOrder = sort.direction;
    }

    this.currentPage.set(1);
    this.loadedExtraPages = 0;
    this.fetchUsers(false);
  }

  public applyFilter(value: string): void {
    this.searchValue.set(value);
    this.dataSource.filter = value.trim().toLowerCase();
  }

  public clearSearch(): void {
    this.searchValue.set('');
    this.dataSource.filter = '';
  }

  public openEditDialog(user: UserEntity): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      width: '480px',
      data: user,
    });

    dialogRef.afterClosed().subscribe((updatedUser: UserEntity | undefined) => {
      if (updatedUser) {
        this.allUsers = this.allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        this.dataSource.data = this.allUsers;
        this.dataSource.filter = this.searchValue().trim().toLowerCase();
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
    return this.totalUsersCount;
  }

  public get filteredUsers(): number {
    return this.dataSource.filteredData.length;
  }

  public get hasMoreUsers(): boolean {
    return this.currentPage() + this.loadedExtraPages < this.totalPages;
  }

  public get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalUsersCount / this.pageSize));
  }

  public loadMoreUsers(): void {
    if (!this.hasMoreUsers) {
      return;
    }

    this.loadedExtraPages += 1;
    this.fetchUsers(true);
  }

  public getGroupName(groupId: number | null): string {
    if (groupId == null) {
      return 'Без группы';
    }

    return this.groupNames()[groupId] ?? `Группа #${groupId}`;
  }

  public deleteUser(user: UserEntity): void {
    const isConfirmed = window.confirm(`Удалить пользователя ${user.email}?`);
    if (!isConfirmed) {
      return;
    }

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

  private fetchUsers(append: boolean): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const requestedPage = this.currentPage() + this.loadedExtraPages;

    forkJoin({
      usersPage: this.usersService.getUsersPage({
        page: requestedPage,
        limit: this.pageSize,
        sortBy: this.sortField,
        order: this.sortOrder,
      }),
      groups: this.groupsService.getGroups(),
    }).subscribe({
      next: ({ usersPage, groups }) => {
        const names: Record<number, string> = {};
        groups.forEach((group: GroupEntity) => {
          names[group.id] = group.name;
        });

        this.groupNames.set(names);
        this.totalUsersCount = usersPage.total;
        this.allUsers = append ? [...this.allUsers, ...usersPage.items] : usersPage.items;
        this.dataSource.data = this.allUsers;
        this.dataSource.filter = this.searchValue().trim().toLowerCase();
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.errorMessage.set('Ошибка при загрузке пользователей.');
        this.isLoading.set(false);
        console.error(err);
      },
    });
  }
}

