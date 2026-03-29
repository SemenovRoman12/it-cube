import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { GroupEntity } from '../../../../core/models/group.model';

@Component({
  selector: 'teacher-group-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './teacher-group-card.component.html',
  styleUrl: './teacher-group-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherGroupCardComponent {
  public readonly group = input.required<GroupEntity>();
  public readonly openRequested = output<number>();

  public onOpenRequested(): void {
    this.openRequested.emit(this.group().id);
  }
}
