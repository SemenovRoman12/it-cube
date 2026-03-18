import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';

@Component({
  selector: 'admin-container',
  imports: [RouterLink, RouterOutlet, MatButtonModule, MatIconModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly router = inject(Router);
  public readonly isAdminRoot = signal(false);

  constructor() {
    this.updateAdminRootState(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.updateAdminRootState((event as NavigationEnd).urlAfterRedirects);
      });
  }

  private updateAdminRootState(url: string): void {
    const tree = this.router.parseUrl(url);
    const primary = tree.root.children['primary'];
    const segments = primary?.segments.map((segment) => segment.path) ?? [];
    this.isAdminRoot.set(segments.length === 1 && segments[0] === 'admin');
  }
}
