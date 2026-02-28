import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'student',
  imports: [],
  templateUrl: './student.component.html',
  styleUrl: './student.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentComponent {

}
