import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLinkWithHref, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'sidenav-layout',
  imports: [MatSidenavModule, MatListModule, MatIconModule, RouterLinkWithHref, RouterOutlet],
  templateUrl: './sidenav-layout.component.html',
  styleUrl: './sidenav-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  public readonly toggleRequested = input(false);

  public readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 991px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  public readonly role = computed(() => this.authService.user()?.role ?? null);
  public readonly opened = signal(true);

  constructor() {
    effect(() => {
      if (this.isMobile()) {
        this.opened.set(false);
        return;
      }

      this.opened.set(true);
    });

    let isFirstToggleEffectRun = true;
    effect(() => {
      this.toggleRequested();

      if (isFirstToggleEffectRun) {
        isFirstToggleEffectRun = false;
        return;
      }

      this.opened.update((isOpened) => !isOpened);
    });
  }

  public closeSidenavOnTouch(): void {
    if (this.isMobile()) {
      this.opened.set(false);
    }
  }

  public onLogout(): void {
    this.authService.logout();
    this.closeSidenavOnTouch();
  }
}
