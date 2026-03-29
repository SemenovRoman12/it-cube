import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'teacher-attendance-analytics',
  imports: [MatCardModule, TranslateModule],
  templateUrl: './teacher-attendance-analytics.component.html',
  styleUrl: './teacher-attendance-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherAttendanceAnalyticsComponent {
  private readonly route = inject(ActivatedRoute);

  public readonly groupId = computed(() => Number(this.route.snapshot.paramMap.get('groupId')) || null);
}

