import {Component, ChangeDetectionStrategy, signal, effect} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'header-layout',
  imports: [MatToolbarModule, MatIconButton, MatIcon],
  templateUrl: './header-layout.component.html',
  styleUrl: './header-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderLayoutComponent {
  public darkMode = signal<boolean>(false);

  public setDarkMode = effect(() => {
    document.documentElement.classList.toggle('dark', this.darkMode());
  });
}
