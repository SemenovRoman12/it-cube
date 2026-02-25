import { Component, inject, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserEntity } from '../../../models/user.model';
import { UsersService } from '../../../core/admin/services/users.service';
import { UserEditDialogComponent } from '../../../core/admin/features/user-edit-dialog/user-edit-dialog.component';

@Component({
  selector: 'app-admin-users',
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
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit, AfterViewInit {
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);

  @ViewChild(MatSort) sort!: MatSort;

  public dataSource = new MatTableDataSource<UserEntity>([]);
  public isLoading = signal(false);
  public errorMessage = signal('');
  public searchValue = signal('');

  public displayedColumns = ['id', 'email', 'role', 'actions'];

  public ngOnInit(): void {
    this.loadUsers();
  }

  public ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'id': return item.id;
        case 'email': return item.email.toLowerCase();
        case 'role': return item.role;
        default: return '';
      }
    };
  }

  public loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.dataSource.data = users;
        // Re-assign sort after data load to ensure it works
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Ошибка при загрузке пользователей.');
        this.isLoading.set(false);
        console.error(err);
      },
    });
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
        this.dataSource.data = this.dataSource.data.map((u) =>
          u.id === updatedUser.id ? updatedUser : u
        );
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

  public getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      admin: 'warn',
      teacher: 'primary',
      user: 'accent',
    };
    return colors[role] ?? 'default';
  }

  public get totalUsers(): number {
    return this.dataSource.data.length;
  }

  public get filteredUsers(): number {
    return this.dataSource.filteredData.length;
  }
}
