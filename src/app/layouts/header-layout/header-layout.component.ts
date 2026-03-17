import { Component, ChangeDetectionStrategy, signal, effect, output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'header-layout',
  imports: [MatToolbarModule, MatIconButton, MatIcon, RouterLink],
  templateUrl: './header-layout.component.html',
  styleUrl: './header-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderLayoutComponent {
  public readonly sidenavToggle = output<void>();
  public darkMode = signal<boolean>(false);

  public setDarkMode = effect(() => {
    document.documentElement.classList.toggle('dark', this.darkMode());
  });

  public onToggleSidenav(): void {
    this.sidenavToggle.emit();
  }
}
