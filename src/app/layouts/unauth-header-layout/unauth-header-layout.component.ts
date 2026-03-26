import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { LanguageToggleComponent } from '../../shared/ui/language-toggle/language-toggle.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'unauth-header-layout',
  imports: [MatToolbarModule, RouterLink, LanguageToggleComponent, ThemeToggleComponent],
  templateUrl: './unauth-header-layout.component.html',
  styleUrl: './unauth-header-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthHeaderLayoutComponent {}

