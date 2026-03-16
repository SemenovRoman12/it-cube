import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { GroupCreateDialogComponent } from '../group-create-dialog/group-create-dialog.component';
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
    MatListModule,
  ],
  templateUrl: './admin-groups.component.html',
  styleUrl: './admin-groups.component.scss',
})
export class AdminGroupsComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  public readonly isLoading = signal(false);
  public readonly errorMessage = signal('');
  public readonly groups = signal<GroupEntity[]>([]);

  public ngOnInit(): void {
    this.loadGroups();
  }

  public loadGroups(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups);
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
        this.groups.set([...this.groups(), createdGroup]);
      }
    });
  }

  public openGroup(groupId: number): void {
    this.router.navigate(['/admin/groups', groupId]);
  }
}

