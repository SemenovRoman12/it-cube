import { Component } from '@angular/core';
import { HeaderLayoutComponent } from '../header-layout/header-layout.component';
import { RouterOutlet } from "@angular/router";
import { FooterLayoutComponent } from '../footer-layout/footer-layout.component'; 

@Component({
  selector: 'main-layout',
  imports: [HeaderLayoutComponent, RouterOutlet, FooterLayoutComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {

}
