import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
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
  private readonly defaultPageSize = 20;

  private _sort!: MatSort;
  private _paginator!: MatPaginator;
  private allUsers: UserEntity[] = [];

  @ViewChild(MatSort)
  set sort(value: MatSort) {
    if (value) {
      this._sort = value;
      this.dataSource.sort = value;
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
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'id':
            return item.id;
          case 'full_name':
            return item.full_name.toLowerCase();
          case 'email':
            return item.email.toLowerCase();
          case 'role':
            return item.role;
          case 'group_id':
            return this.getGroupName(item.group_id).toLowerCase();
          case 'created_at':
            return new Date(item.created_at).getTime();
          default:
            return '';
        }
      };
    }
  }

  @ViewChild(MatPaginator)
  set paginator(value: MatPaginator) {
    if (value) {
      this._paginator = value;
      this.dataSource.paginator = value;
      this._paginator.pageSize = this.defaultPageSize;
      this._paginator.pageIndex = 0;
      this._paginator.hidePageSize = true;
      this._paginator.showFirstLastButtons = true;
    }
  }

  public dataSource = new MatTableDataSource<UserEntity>([]);
  public isLoading = signal(false);
  public errorMessage = signal('');
  public searchValue = signal('');
  public deletingUserId = signal<number | null>(null);
  public groupNames = signal<Record<number, string>>({});

  public displayedColumns = ['id', 'full_name', 'email', 'role', 'group_id', 'created_at', 'actions'];

  public ngOnInit(): void {
    this.loadUsers();
  }

  public loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      users: this.usersService.getUsers(),
      groups: this.groupsService.getGroups(),
    }).subscribe({
      next: ({ users, groups }) => {
        const names: Record<number, string> = {};
        groups.forEach((group: GroupEntity) => {
          names[group.id] = group.name;
        });

        this.groupNames.set(names);
        this.allUsers = users;
        this.refreshVisibleUsers();

        if (this._paginator) {
          this._paginator.pageSize = this.defaultPageSize;
          this._paginator.firstPage();
          this.dataSource.paginator = this._paginator;
        }

        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.errorMessage.set('Ошибка при загрузке пользователей.');
        this.isLoading.set(false);
        console.error(err);
      },
    });
  }

  public applyFilter(value: string): void {
    this.searchValue.set(value);
    this.dataSource.filter = value.trim().toLowerCase();

    if (this._paginator) {
      this._paginator.firstPage();
    }
  }

  public clearSearch(): void {
    this.searchValue.set('');
    this.dataSource.filter = '';

    if (this._paginator) {
      this._paginator.firstPage();
    }
  }

  public openEditDialog(user: UserEntity): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      width: '480px',
      data: user,
    });

    dialogRef.afterClosed().subscribe((updatedUser: UserEntity | undefined) => {
      if (updatedUser) {
        this.allUsers = this.allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        this.refreshVisibleUsers();
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
        this.allUsers = [...this.allUsers, createdUser];
        this.refreshVisibleUsers();
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
    return this.allUsers.length;
  }

  public get filteredUsers(): number {
    return this.dataSource.filteredData.length;
  }

  public get hasMoreUsers(): boolean {
    if (!this._paginator) {
      return false;
    }

    const visibleUntil = (this._paginator.pageIndex + 1) * this._paginator.pageSize;
    return visibleUntil < this.dataSource.filteredData.length;
  }

  public loadMoreUsers(): void {
    if (!this.hasMoreUsers || !this._paginator) {
      return;
    }

    const currentFirstItemIndex = this._paginator.pageIndex * this._paginator.pageSize;
    const maxPageSize = Math.max(this.defaultPageSize, this.dataSource.filteredData.length);
    const nextPageSize = Math.min(this._paginator.pageSize + this.defaultPageSize, maxPageSize);

    this._paginator.pageSize = nextPageSize;
    this._paginator.pageIndex = Math.floor(currentFirstItemIndex / nextPageSize);
    this.dataSource.paginator = this._paginator;
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
        this.allUsers = this.allUsers.filter((u) => u.id !== user.id);
        this.refreshVisibleUsers();
        this.deletingUserId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении пользователя. Попробуйте снова.');
        this.deletingUserId.set(null);
        console.error(err);
      },
    });
  }

  private refreshVisibleUsers(): void {
    this.dataSource.data = this.allUsers;

    if (this._paginator) {
      const maxPageIndex = Math.max(0, Math.ceil(this.dataSource.filteredData.length / this._paginator.pageSize) - 1);
      if (this._paginator.pageIndex > maxPageIndex) {
        this._paginator.pageIndex = maxPageIndex;
      }
    }
  }
}

