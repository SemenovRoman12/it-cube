import { Component, ChangeDetectionStrategy, signal, effect, output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LanguageSwitchService } from '../../core/ui/services/language-switch.service';

@Component({
  selector: 'header-layout',
  imports: [MatToolbarModule, MatButton, MatIconButton, MatIcon, RouterLink],
  templateUrl: './header-layout.component.html',
  styleUrl: './header-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderLayoutComponent {
  private readonly languageSwitchService = inject(LanguageSwitchService);

  public readonly sidenavToggle = output<void>();
  public readonly darkMode = signal<boolean>(false);
  public readonly currentLanguage = this.languageSwitchService.currentLanguage;

  public readonly setDarkMode = effect(() => {
    document.documentElement.classList.toggle('dark', this.darkMode());
  });

  public onToggleSidenav(): void {
    this.sidenavToggle.emit();
  }

  public onToggleLanguage(): void {
    this.languageSwitchService.toggleLanguage();
  }
}
