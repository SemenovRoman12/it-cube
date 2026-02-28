import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'footer-layout',
  imports: [MatToolbarModule],
  templateUrl: './footer-layout.component.html',
  styleUrl: './footer-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterLayoutComponent {

}
