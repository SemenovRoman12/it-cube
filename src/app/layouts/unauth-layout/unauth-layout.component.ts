import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterLayoutComponent } from '../footer-layout/footer-layout.component';
import { UnauthHeaderLayoutComponent } from '../unauth-header-layout/unauth-header-layout.component';

@Component({
  selector: 'unauth-layout',
  imports: [RouterOutlet, UnauthHeaderLayoutComponent, FooterLayoutComponent],
  templateUrl: './unauth-layout.component.html',
  styleUrl: './unauth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthLayoutComponent {}

