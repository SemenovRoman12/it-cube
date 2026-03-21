import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'teacher',
  imports: [RouterOutlet],
  templateUrl: './teacher.component.html',
  styleUrl: './teacher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherComponent {}
