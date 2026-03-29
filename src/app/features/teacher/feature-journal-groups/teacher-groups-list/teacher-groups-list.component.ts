import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GroupsListComponent } from '../../shared/groups-list/groups-list.component';

@Component({
  selector: 'teacher-groups-list',
  imports: [GroupsListComponent],
  templateUrl: './teacher-groups-list.component.html',
  styleUrl: './teacher-groups-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherGroupsListComponent {}
