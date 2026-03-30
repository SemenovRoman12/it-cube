import { Component, ChangeDetectionStrategy, DestroyRef, OnInit, output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { NotificationsPopoverComponent } from './notifications-popover/notifications-popover.component';
import { LanguageToggleComponent } from '../../shared/ui/language-toggle/language-toggle.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

const DEFAULT_AVATAR_MOKKY_URL = 'http://mokky.dev/uploaded/dfnhxiq6j/image/upload/v1774430966/file_pacrzh.jpg';

@Component({
  selector: 'header-layout',
  imports: [
    MatToolbarModule,
    MatIconButton,
    MatIcon,
    MatBadgeModule,
    MatMenuModule,
    RouterLink,
    TranslateModule,
    NotificationsPopoverComponent,
    LanguageToggleComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './header-layout.component.html',
  styleUrl: './header-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly sidenavToggle = output<void>();
  public readonly currentUser = this.authService.user;
  public readonly unreadCount = this.notificationsService.unreadCount;
  public readonly notifications = this.notificationsService.notifications;
  public readonly notificationsLoading = this.notificationsService.isLoading;

  public ngOnInit(): void {
    if (this.currentUser()?.role === 'user') {
      this.notificationsService.startPolling();
      this.notificationsService.loadUnreadCount().subscribe();
    }
  }

  public getHeaderAvatarUrl(): string {
    return this.currentUser()?.avatar_url?.trim() || DEFAULT_AVATAR_MOKKY_URL;
  }

  public onHeaderAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (!image) {
      return;
    }

    image.src = DEFAULT_AVATAR_MOKKY_URL;
  }

  public onToggleSidenav(): void {
    this.sidenavToggle.emit();
  }

  public onNotificationsMenuOpened(): void {
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

}
