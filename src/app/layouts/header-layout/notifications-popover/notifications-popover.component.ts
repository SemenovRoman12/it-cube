import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationEntity } from '../../../core/models/notification.model';

@Component({
  selector: 'notifications-popover',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule, DatePipe],
  templateUrl: './notifications-popover.component.html',
  styleUrl: './notifications-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPopoverComponent {
  public readonly notifications = input<NotificationEntity[]>([]);
  public readonly unreadCount = input(0);
  public readonly isLoading = input(false);

  public readonly notificationOpen = output<number>();

  public onOpenNotification(notificationId: number): void {
    this.notificationOpen.emit(notificationId);
  }
}

