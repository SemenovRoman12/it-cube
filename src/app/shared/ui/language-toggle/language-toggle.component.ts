import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitchService } from '../../../core/ui/services/language-switch.service';

@Component({
  selector: 'language-toggle',
  imports: [MatButtonModule, TranslateModule],
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageToggleComponent {
  private readonly languageSwitchService = inject(LanguageSwitchService);

  public readonly currentLanguage = this.languageSwitchService.currentLanguage;

  public onToggleLanguage(): void {
    this.languageSwitchService.toggleLanguage();
  }
}

