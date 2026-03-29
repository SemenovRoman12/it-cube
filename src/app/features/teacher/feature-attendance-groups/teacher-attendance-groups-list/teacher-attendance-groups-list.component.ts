import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'teacher-attendance-groups-list',
  imports: [MatCardModule, TranslateModule],
  templateUrl: './teacher-attendance-groups-list.component.html',
  styleUrl: './teacher-attendance-groups-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherAttendanceGroupsListComponent {}

