import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LanguageSwitchService } from '../../core/ui/services/language-switch.service';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeSwitchService } from '../../core/ui/services/theme-switch.service';

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

  public readonly sidenavToggle = output<void>();
  public readonly currentLanguage = this.languageSwitchService.currentLanguage;
  public readonly darkMode = this.themeSwitchService.currentTheme;

  public onToggleSidenav(): void {
    this.sidenavToggle.emit();
  }

  public onToggleLanguage(): void {
    this.languageSwitchService.toggleLanguage();
  }

  public onToggleTheme(): void {
    this.themeSwitchService.toggleTheme();
  }
}
