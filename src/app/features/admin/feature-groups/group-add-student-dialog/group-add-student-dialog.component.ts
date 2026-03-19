import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime, distinctUntilChanged, finalize, forkJoin, takeUntil } from 'rxjs';
import { UserEntity } from '../../../../core/models/user.model';
import { UsersService } from '../../services/users.service';

type DialogData = {
  groupId: number;
};

@Component({
  selector: 'app-group-add-student-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './group-add-student-dialog.component.html',
  styleUrl: './group-add-student-dialog.component.scss',
})
export class GroupAddStudentDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly dialogRef = inject(MatDialogRef<GroupAddStudentDialogComponent>);

  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  public selectedUserIds: number[] = [];
  public users: UserEntity[] = [];
  public searchQuery = '';
  public showOnlySelected = false;
  public isLoading = false;
  public isUsersLoading = false;
  public isLoadingMore = false;
  public errorMessage = '';
  public loadedUsersCount = 0;

  private currentPage = 1;
  private readonly pageSize = 7;
  private totalPages = 1;

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: DialogData) {}

  public ngOnInit(): void {
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.resetAndLoadUsers());

    this.fetchUsers(false);
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public get filteredUsers(): UserEntity[] {
    if (!this.showOnlySelected) {
      return this.users;
    }

    return this.users.filter((user) => this.selectedUserIds.includes(user.id));
  }

  public get hasMoreUsers(): boolean {
    return this.currentPage < this.totalPages;
  }

  public onSearchChange(value: string): void {
    this.search$.next(value.trim());
  }

  public loadMoreUsers(): void {
    if (!this.hasMoreUsers || this.isUsersLoading || this.isLoadingMore) {
      return;
    }

    this.currentPage += 1;
    this.fetchUsers(true);
  }

  public onListScroll(event: Event): void {
    if (this.showOnlySelected || this.isUsersLoading || this.isLoadingMore || !this.hasMoreUsers) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= 120) {
      this.loadMoreUsers();
    }
  }

  public toggleUserSelection(userId: number): void {
    if (this.isLoading) {
      return;
    }

    const selectedIndex = this.selectedUserIds.indexOf(userId);
    if (selectedIndex >= 0) {
      this.selectedUserIds = this.selectedUserIds.filter((id) => id !== userId);
      return;
    }

    this.selectedUserIds = [...this.selectedUserIds, userId];
  }

  public isUserSelected(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }

  public clearSearch(): void {
    this.searchQuery = '';
    this.search$.next('');
  }

  public onSubmit(): void {
    if (!this.selectedUserIds.length) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const requests = this.selectedUserIds.map((userId) => this.usersService.assignUserToGroup(userId, this.data.groupId));

    forkJoin(requests).subscribe({
      next: (updatedUsers) => {
        this.isLoading = false;
        this.dialogRef.close(updatedUsers);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = 'Ошибка при добавлении учеников в группу.';
        console.error(err);
      },
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  private resetAndLoadUsers(): void {
    this.currentPage = 1;
    this.totalPages = 1;
    this.users = [];
    this.loadedUsersCount = 0;
    this.fetchUsers(false);
  }

  private fetchUsers(append: boolean): void {
    const showBlockingLoader = !append && this.users.length === 0;
    if (showBlockingLoader) {
      this.isUsersLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    this.errorMessage = '';

    this.usersService
      .getUsersPage({
        page: this.currentPage,
        limit: this.pageSize,
        sortBy: 'group_id',
        order: 'asc',
        filters: this.buildSearchFilters(this.searchQuery),
      })
      .pipe(
        finalize(() => {
          this.isUsersLoading = false;
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (usersPage) => {
          this.totalPages = usersPage.totalPages;
          const ungroupedItems = usersPage.items.filter((user) => user.group_id == null || user.group_id === 0);
          this.users = append ? [...this.users, ...ungroupedItems] : ungroupedItems;
          this.loadedUsersCount = this.users.length;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = 'Ошибка при загрузке учеников.';
          console.error(err);
          this.cdr.detectChanges();
        },
      });
  }

  private buildSearchFilters(rawSearch: string): Record<string, string | number> {
    const search = rawSearch.trim();
    const baseFilters: Record<string, string | number> = {
      role: 'user',
    };

    if (!search) {
      return baseFilters;
    }

    if (search.includes('@')) {
      return {
        ...baseFilters,
        email: `*${search}`,
      };
    }

    return {
      ...baseFilters,
      full_name: `*${search}`,
    };
  }
}

