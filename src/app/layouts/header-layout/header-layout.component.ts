import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LanguageSwitchService } from '../../core/ui/services/language-switch.service';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeSwitchService } from '../../core/ui/services/theme-switch.service';
import { AuthService } from '../../core/auth/services/auth.service';

const DEFAULT_AVATAR_MOKKY_URL = 'http://mokky.dev/uploaded/dfnhxiq6j/image/upload/v1774430966/file_pacrzh.jpg';

@Component({
  selector: 'header-layout',
  imports: [MatToolbarModule, MatButton, MatIconButton, MatIcon, RouterLink, TranslateModule],
  templateUrl: './header-layout.component.html',
  styleUrl: './header-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderLayoutComponent {
  private readonly languageSwitchService = inject(LanguageSwitchService);
  private readonly themeSwitchService = inject(ThemeSwitchService);
  private readonly authService = inject(AuthService);

  public readonly sidenavToggle = output<void>();
  public readonly currentLanguage = this.languageSwitchService.currentLanguage;
  public readonly darkMode = this.themeSwitchService.currentTheme;
  public readonly currentUser = this.authService.user;

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

  public onToggleLanguage(): void {
    this.languageSwitchService.toggleLanguage();
  }

  public onToggleTheme(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;

    if (!button) {
      this.themeSwitchService.toggleTheme();
      return;
    }

    const rect = button.getBoundingClientRect();

    this.themeSwitchService.toggleThemeWithTransition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }
}
