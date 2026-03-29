export type AttendancePeriod = 'q1' | 'q2' | 'year';
export type AttendanceResolution = 'week' | 'month';

export interface AttendanceAnalyticsQuery {
  groupId: number;
  period: AttendancePeriod;
  resolution: AttendanceResolution;
}

export interface AttendanceIntervalStat {
  key: string;
  label: string;
  fromIsoDate: string;
  toIsoDate: string;
  totalEntries: number;
  presentEntries: number;
  attendancePercent: number;
}

export interface AttendanceAnalyticsResult {
  groupId: number;
  period: AttendancePeriod;
  resolution: AttendanceResolution;
  intervals: AttendanceIntervalStat[];
}

export interface AttendanceChartPoint {
  name: string;
  value: number;
}

