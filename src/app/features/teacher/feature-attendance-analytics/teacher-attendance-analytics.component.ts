import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import {
  AttendanceAnalyticsResult,
  AttendanceChartPoint,
  AttendancePeriod,
  AttendanceResolution,
} from './models/attendance-analytics.model';
import { TeacherAttendanceAnalyticsService } from './services/teacher-attendance-analytics.service';
import { AttendanceChartComponent } from './attendance-chart/attendance-chart.component';

@Component({
  selector: 'teacher-attendance-analytics',
  imports: [
    MatCardModule,
    MatToolbarModule,
    MatButtonToggleModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    AttendanceChartComponent,
    TranslateModule,
  ],
  templateUrl: './teacher-attendance-analytics.component.html',
  styleUrl: './teacher-attendance-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherAttendanceAnalyticsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly analyticsService = inject(TeacherAttendanceAnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private requestVersion = 0;

  public readonly groupId = computed(() => Number(this.route.snapshot.paramMap.get('groupId')) || null);
  public readonly selectedPeriod = signal<AttendancePeriod>('q1');
  public readonly selectedResolution = signal<AttendanceResolution>('week');
  public readonly analytics = signal<AttendanceAnalyticsResult | null>(null);
  public readonly chartData = computed<AttendanceChartPoint[]>(() => {
    const analytics = this.analytics();
    return analytics ? this.analyticsService.toChartSeries(analytics) : [];
  });
  public readonly isLoading = signal(false);
  public readonly error = signal<string | null>(null);

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
    if (value === this.selectedPeriod()) {
      return;
    }

    this.selectedPeriod.set(value as AttendancePeriod);
    this.loadAnalytics();
  }

  public onResolutionChange(value: string): void {
    if (value === this.selectedResolution()) {
      return;
    }

    this.selectedResolution.set(value as AttendanceResolution);
    this.loadAnalytics();
  }

  public loadAnalytics(): void {
    const groupId = this.groupId();
    if (groupId == null) {
      this.error.set('TEACHER.ATTENDANCE.ANALYTICS.ERROR');
      this.analytics.set(null);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    const currentRequestVersion = ++this.requestVersion;
    const requestPayload = {
      groupId,
      period: this.selectedPeriod(),
      resolution: this.selectedResolution(),
    };

    console.debug('[attendance] load analytics start', requestPayload);

    this.analyticsService
      .getGroupAttendanceAnalytics(requestPayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (currentRequestVersion !== this.requestVersion) {
            return;
          }

          console.debug('[attendance] load analytics success', {
            ...requestPayload,
            intervals: result.intervals.length,
          });
          this.analytics.set(result);
          this.isLoading.set(false);
        },
        error: (error) => {
          if (currentRequestVersion !== this.requestVersion) {
            return;
          }

          console.error('[attendance] load analytics error', {
            ...requestPayload,
            error,
          });
          this.error.set('TEACHER.ATTENDANCE.ANALYTICS.ERROR');
          this.analytics.set(null);
          this.isLoading.set(false);
        },
      });
  }

  constructor() {
    this.loadAnalytics();
  }
}

