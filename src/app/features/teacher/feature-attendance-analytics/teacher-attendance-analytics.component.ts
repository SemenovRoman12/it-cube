import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslateModule } from '@ngx-translate/core';

type AttendancePeriod = 'q1' | 'q2' | 'year';
type AttendanceResolution = 'week' | 'month';

@Component({
  selector: 'teacher-attendance-analytics',
  imports: [MatCardModule, MatToolbarModule, MatButtonToggleModule, TranslateModule],
  templateUrl: './teacher-attendance-analytics.component.html',
  styleUrl: './teacher-attendance-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherAttendanceAnalyticsComponent {
  private readonly route = inject(ActivatedRoute);

  public readonly groupId = computed(() => Number(this.route.snapshot.paramMap.get('groupId')) || null);
  public readonly selectedPeriod = signal<AttendancePeriod>('q1');
  public readonly selectedResolution = signal<AttendanceResolution>('week');

  public readonly periodOptions: Array<{ id: AttendancePeriod; labelKey: string }> = [
    { id: 'q1', labelKey: 'TEACHER.ATTENDANCE.ANALYTICS.PERIOD_Q1' },
    { id: 'q2', labelKey: 'TEACHER.ATTENDANCE.ANALYTICS.PERIOD_Q2' },
    { id: 'year', labelKey: 'TEACHER.ATTENDANCE.ANALYTICS.PERIOD_YEAR' },
  ];

  public readonly resolutionOptions: Array<{ id: AttendanceResolution; labelKey: string }> = [
    { id: 'week', labelKey: 'TEACHER.ATTENDANCE.ANALYTICS.RESOLUTION_WEEK' },
    { id: 'month', labelKey: 'TEACHER.ATTENDANCE.ANALYTICS.RESOLUTION_MONTH' },
  ];

  public onPeriodChange(value: string): void {
    this.selectedPeriod.set(value as AttendancePeriod);
  }

  public onResolutionChange(value: string): void {
    this.selectedResolution.set(value as AttendanceResolution);
  }
}

