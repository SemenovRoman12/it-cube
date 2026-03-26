import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../../core/ui/components/confirm-dialog/confirm-dialog.component';
import { SubjectEntity } from '../../../../core/models/subject.model';
import { ListStateFacade } from '../../shared/list-state';
import { SubjectsService } from '../../services/subjects.service';
import { SubjectCreateDialogComponent } from '../subject-create-dialog/subject-create-dialog.component';
import { SubjectEditDialogComponent } from '../subject-edit-dialog/subject-edit-dialog.component';

@Component({
  selector: 'app-admin-subjects',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    TranslateModule,
  ],
  templateUrl: './admin-subjects.component.html',
  styleUrl: './admin-subjects.component.scss',
})
export class AdminSubjectsComponent implements OnInit {
  private readonly subjectsService = inject(SubjectsService);
  private readonly dialog = inject(MatDialog);

  private readonly listState = new ListStateFacade<SubjectEntity, Record<string, string | number>>(
    {
      loadPage: (query) => this.subjectsService.getSubjectsPage(query),
    },
    {
      pageSize: 10,
      createFilters: (rawSearch) => this.buildSearchFilters(rawSearch),
      loadingErrorMessage: 'Ошибка при загрузке предметов.',
    },
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
  public readonly deletingSubjectId = signal<number | null>(null);
  public readonly currentPage = signal(1);

  public readonly dataSource = new MatTableDataSource<SubjectEntity>([]);
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
    this.loadSubjects(true);
  }

  public loadSubjects(resetToFirstPage = false): void {
    this.listState.load(resetToFirstPage);
  }

  public onPageChange(event: PageEvent): void {
    this.listState.onPageChange(event.pageIndex + 1);
  }

  public onSortChange(sort: Sort): void {
    this.listState.onSortChange(sort);
  }

  public openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubjectCreateDialogComponent, {
      width: '460px',
    });

    dialogRef.afterClosed().subscribe((createdSubject: SubjectEntity | undefined) => {
      if (createdSubject) {
        this.loadSubjects();
      }
    });
  }

  public openEditDialog(subject: SubjectEntity): void {
    const dialogRef = this.dialog.open(SubjectEditDialogComponent, {
      width: '460px',
      data: subject,
    });

    dialogRef.afterClosed().subscribe((updatedSubject: SubjectEntity | undefined) => {
      if (updatedSubject) {
        this.loadSubjects();
      }
    });
  }

  public deleteSubject(subject: SubjectEntity): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Удаление предмета',
        message: `Вы действительно хотите удалить предмет ${subject.name}?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        variant: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.performDeleteSubject(subject);
    });
  }

  private performDeleteSubject(subject: SubjectEntity): void {
    this.deletingSubjectId.set(subject.id);

    this.subjectsService.deleteSubject(subject.id).subscribe({
      next: () => {
        this.deletingSubjectId.set(null);
        this.loadSubjects();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении предмета. Попробуйте снова.');
        this.deletingSubjectId.set(null);
        console.error(err);
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.performDeleteSubject(subject);
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

  public get totalSubjects(): number {
    return this.listState.total;
  }

  public get filteredSubjectsCount(): number {
    return this.listState.total;
  }

  public get hasMoreSubjects(): boolean {
    return this.listState.hasMore;
  }

  public get totalPages(): number {
    return this.listState.totalPages;
  }

  public loadMoreSubjects(): void {
    this.listState.loadMore();
  }

  private performDeleteSubject(subject: SubjectEntity): void {
    this.deletingSubjectId.set(subject.id);

    this.subjectsService.deleteSubject(subject.id).subscribe({
      next: () => {
        this.deletingSubjectId.set(null);
        this.loadSubjects();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set('Ошибка при удалении предмета. Попробуйте снова.');
        this.deletingSubjectId.set(null);
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

