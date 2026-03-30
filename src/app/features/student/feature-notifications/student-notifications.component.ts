import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'student-notifications',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
    DatePipe,
  ],
  templateUrl: './student-notifications.component.html',
  styleUrl: './student-notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentNotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly notifications = this.notificationsService.notifications;
  public readonly isLoading = this.notificationsService.isLoading;
  public readonly hasNotifications = computed(() => this.notifications().length > 0);

  public ngOnInit(): void {
    this.notificationsService
      .refreshForCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  public openNotification(notificationId: number): void {
    const notification = this.notifications().find((item) => item.id === notificationId);

    if (!notification) {
      return;
    }

    this.notificationsService
      .openNotification(notification)
      .pipe(
        finalize(() => this.notificationsService.refreshForCurrentUser().subscribe()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}

