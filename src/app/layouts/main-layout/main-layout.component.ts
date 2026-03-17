import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HeaderLayoutComponent } from '../header-layout/header-layout.component';
import { FooterLayoutComponent } from '../footer-layout/footer-layout.component';
import { SidenavLayoutComponent } from '../sidenav-layout/sidenav-layout.component';

@Component({
  selector: 'main-layout',
  imports: [
    HeaderLayoutComponent,
    SidenavLayoutComponent,
    FooterLayoutComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  public readonly toggleRequested = signal(false);

  public onToggleSidenav(): void {
    this.toggleRequested.update((value) => !value);
  }

}
