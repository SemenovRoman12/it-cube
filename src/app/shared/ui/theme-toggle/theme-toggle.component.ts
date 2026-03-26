import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeSwitchService } from '../../../core/ui/services/theme-switch.service';

@Component({
  selector: 'theme-toggle',
  imports: [MatButtonModule, MatIconModule, TranslateModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  private readonly themeSwitchService = inject(ThemeSwitchService);

  public readonly currentTheme = this.themeSwitchService.currentTheme;

  public onToggleTheme(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;

    if (!button) {
      this.themeSwitchService.toggleTheme();
      return;
    }

    const { left, top, width, height } = button.getBoundingClientRect();

    this.themeSwitchService.toggleThemeWithTransition({
      x: left + width / 2,
      y: top + height / 2,
    });
  }
}

