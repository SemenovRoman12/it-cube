import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationEntity } from '../../../core/models/notification.model';

@Component({
  selector: 'notifications-popover',
  imports: [MatIconButton, MatIconModule, MatProgressBarModule, TranslateModule, DatePipe],
  templateUrl: './notifications-popover.component.html',
  styleUrl: './notifications-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPopoverComponent {
  private static readonly LOAD_MORE_THRESHOLD_PX = 96;

  public readonly notifications = input<NotificationEntity[]>([]);
  public readonly unreadCount = input(0);
  public readonly isLoading = input(false);
  public readonly isLoadingMore = input(false);
  public readonly hasMore = input(true);

  public readonly notificationOpen = output<number>();
  public readonly notificationDelete = output<number>();
  public readonly loadMore = output<void>();

  public onOpenNotification(notificationId: number): void {
    this.notificationOpen.emit(notificationId);
  }

  public onDeleteNotification(event: Event, notificationId: number): void {
    event.stopPropagation();
    this.notificationDelete.emit(notificationId);
  }

  public onContentScroll(event: Event): void {
    const target = event.target as HTMLElement | null;

    if (!target || !this.canLoadMore()) {
      return;
    }

    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom <= NotificationsPopoverComponent.LOAD_MORE_THRESHOLD_PX) {
      this.loadMore.emit();
    }
  }

  public showEmptyState(): boolean {
    return !this.notifications().length && !this.isLoading();
  }

  public showListEnd(): boolean {
    return !this.hasMore() && this.notifications().length > 0;
  }

  private canLoadMore(): boolean {
    return !this.isLoading() && !this.isLoadingMore() && this.hasMore();
  }
}

