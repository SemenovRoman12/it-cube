import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { GroupCreateDialogComponent } from '../group-create-dialog/group-create-dialog.component';
import { GroupEditDialogComponent } from '../group-edit-dialog/group-edit-dialog.component';
import { GroupEntity } from '../../../../core/models/group.model';
import { GroupsService } from '../../services/groups.service';

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
  ],
  templateUrl: './admin-groups.component.html',
  styleUrl: './admin-groups.component.scss',
})
export class AdminGroupsComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private _sort!: MatSort;

  @ViewChild(MatSort)
  set sort(value: MatSort) {
    if (value) {
      this._sort = value;
      this.dataSource.sort = value;
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'id':
            return item.id;
          case 'name':
            return item.name.toLowerCase();
          default:
            return '';
        }
      };
    }
  }

  public readonly isLoading = signal(false);
  public readonly errorMessage = signal('');
  public readonly searchValue = signal('');
  public readonly deletingGroupId = signal<number | null>(null);

  public readonly dataSource = new MatTableDataSource<GroupEntity>([]);
  public readonly displayedColumns = ['id', 'name', 'actions'];

  public ngOnInit(): void {
    this.loadGroups();
  }

  public loadGroups(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.dataSource.data = groups;
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.errorMessage.set('Ошибка при загрузке групп.');
        this.isLoading.set(false);
        console.error(err);
      },
    });
  }

  public openCreateDialog(): void {
    const dialogRef = this.dialog.open(GroupCreateDialogComponent, {
      width: '460px',
    });

    dialogRef.afterClosed().subscribe((createdGroup: GroupEntity | undefined) => {
      if (createdGroup) {
        this.dataSource.data = [...this.dataSource.data, createdGroup];
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
        this.dataSource.data = this.dataSource.data.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
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
        this.dataSource.data = this.dataSource.data.filter((g) => g.id !== group.id);
        this.deletingGroupId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении группы. Попробуйте снова.');
        this.deletingGroupId.set(null);
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

  public get totalGroups(): number {
    return this.dataSource.data.length;
  }

  public get filteredGroupsCount(): number {
    return this.dataSource.filteredData.length;
  }
}

