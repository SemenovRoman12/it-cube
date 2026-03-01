import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'admin',
  imports: [RouterLink, RouterOutlet, MatButtonModule, MatIconModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  constructor(private readonly router: Router) {}

  public isAdminRoot(): boolean {
    const tree = this.router.parseUrl(this.router.url);
    const primary = tree.root.children['primary'];
    const segments = primary?.segments.map((segment) => segment.path) ?? [];
    return segments.length === 1 && segments[0] === 'admin';
  }
}
