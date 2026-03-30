import { Component, ChangeDetectionStrategy, OnInit, output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
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
    RouterLink,
    TranslateModule,
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

  public readonly sidenavToggle = output<void>();
  public readonly currentUser = this.authService.user;
  public readonly unreadCount = this.notificationsService.unreadCount;

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

}
