import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { JournalEntryEntity } from '../../models/journal-entry.model';
import { LessonEntity } from '../../models/lesson.model';
import { TeacherJournalApiService } from '../../services/teacher-journal-api.service';
import {
  AttendanceAnalyticsQuery,
  AttendanceAnalyticsResult,
  AttendanceChartPoint,
  AttendanceIntervalStat,
  AttendancePeriod,
  AttendanceResolution,
} from '../models/attendance-analytics.model';
import { getQuarterBounds, resolveAcademicStartYear } from '../../feature-journal-lessons/models/journal-quarter.config';

interface DateBounds {
  startIsoDate: string;
  endIsoDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeacherAttendanceAnalyticsService {
  private readonly journalApi = inject(TeacherJournalApiService);

  public getGroupAttendanceAnalytics(query: AttendanceAnalyticsQuery): Observable<AttendanceAnalyticsResult> {
    return forkJoin({
      lessons: this.journalApi.getLessonsByGroup(query.groupId),
      students: this.journalApi.getStudentsByGroup(query.groupId),
    }).pipe(
      switchMap(({ lessons, students }) => {
        const bounds = this.resolveBounds(query.period, lessons);
        const scopedLessons = lessons.filter((lesson) => this.isDateInBounds(lesson.date, bounds));
        const studentsCount = students.length;

        console.debug('[attendance] lessons loaded', {
          groupId: query.groupId,
          period: query.period,
          resolution: query.resolution,
          allLessons: lessons.length,
          scopedLessons: scopedLessons.length,
          studentsCount,
          bounds,
        });

        if (!scopedLessons.length) {
          return of({
            groupId: query.groupId,
            period: query.period,
            resolution: query.resolution,
            intervals: [],
          });
        }

        const lessonIds = scopedLessons.map((lesson) => lesson.id);
        const lessonDateMap = new Map(scopedLessons.map((lesson) => [lesson.id, lesson.date]));

        return this.journalApi.getJournalEntriesByLessonIds(lessonIds).pipe(
          map((entries) => ({
            groupId: query.groupId,
            period: query.period,
            resolution: query.resolution,
            intervals: this.buildIntervals(entries, scopedLessons, lessonDateMap, bounds, query.resolution, studentsCount),
          })),
        );
      }),
    );
  }

  public toChartSeries(result: AttendanceAnalyticsResult): AttendanceChartPoint[] {
    return result.intervals.map((item) => ({
      name: item.label,
      value: item.attendancePercent,
    }));
  }

  private resolveBounds(period: AttendancePeriod, lessons: LessonEntity[]): DateBounds {
    const academicStartYear = resolveAcademicStartYear(lessons.map((lesson) => lesson.date));

    if (period === 'year') {
      return {
        startIsoDate: `${academicStartYear}-09-01`,
        endIsoDate: `${academicStartYear + 1}-05-25`,
      };
    }

    return getQuarterBounds(period, academicStartYear);
  }

  private buildIntervals(
    entries: JournalEntryEntity[],
    scopedLessons: LessonEntity[],
    lessonDateMap: Map<number, string>,
    bounds: DateBounds,
    resolution: AttendanceResolution,
    studentsCount: number,
  ): AttendanceIntervalStat[] {
    const bucketMap = this.createIntervalSeedByBounds(bounds, resolution);

    for (const lesson of scopedLessons) {
      const lessonBucket = this.resolveBucket(lesson.date, resolution);
      const existing = bucketMap.get(lessonBucket.key);
      if (!existing) {
        continue;
      }

      existing.totalEntries += studentsCount;
      bucketMap.set(lessonBucket.key, existing);
    }

    for (const entry of entries) {
      const lessonDate = lessonDateMap.get(entry.lesson_id);
      if (!lessonDate) {
        continue;
      }

      const bucket = this.resolveBucket(lessonDate, resolution);
      const existing = bucketMap.get(bucket.key) ?? {
        key: bucket.key,
        label: bucket.label,
        fromIsoDate: bucket.fromIsoDate,
        toIsoDate: bucket.toIsoDate,
        totalEntries: 0,
        presentEntries: 0,
        attendancePercent: 0,
      };

      if (this.isPresentEntry(entry)) {
        existing.presentEntries += 1;
      }

      bucketMap.set(bucket.key, existing);
    }

    const result = [...bucketMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((interval) => ({
        ...interval,
        attendancePercent: interval.totalEntries
          ? Number(((interval.presentEntries / interval.totalEntries) * 100).toFixed(1))
          : 0,
      }));

    console.debug('[attendance] intervals computed', {
      resolution,
      totalIntervals: result.length,
      intervalsWithData: result.filter((item) => item.totalEntries > 0).length,
      totalEntries: result.reduce((acc, item) => acc + item.totalEntries, 0),
    });

    return result;
  }

  private createIntervalSeedByBounds(bounds: DateBounds, resolution: AttendanceResolution): Map<string, AttendanceIntervalStat> {
    const seed = new Map<string, AttendanceIntervalStat>();
    const cursor = new Date(`${bounds.startIsoDate}T00:00:00`);
    const end = new Date(`${bounds.endIsoDate}T00:00:00`);

    while (cursor <= end) {
      const isoDate = this.toLocalIsoDate(cursor);
      const bucket = this.resolveBucket(isoDate, resolution);
      if (!seed.has(bucket.key)) {
        seed.set(bucket.key, {
          key: bucket.key,
          label: bucket.label,
          fromIsoDate: bucket.fromIsoDate,
          toIsoDate: bucket.toIsoDate,
          totalEntries: 0,
          presentEntries: 0,
          attendancePercent: 0,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return seed;
  }

  private resolveBucket(isoDate: string, resolution: AttendanceResolution): {
    key: string;
    label: string;
    fromIsoDate: string;
    toIsoDate: string;
  } {
    const date = new Date(`${isoDate}T00:00:00`);

    if (resolution === 'month') {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthText = String(month).padStart(2, '0');
      const key = `${year}-${monthText}`;
      return {
        key,
        label: `${monthText}.${year}`,
        fromIsoDate: `${year}-${monthText}-01`,
        toIsoDate: `${year}-${monthText}-31`,
      };
    }

    const weekInfo = this.getIsoWeekInfo(date);
    const weekText = String(weekInfo.week).padStart(2, '0');
    const key = `${weekInfo.year}-W${weekText}`;
    const startText = this.isoDateToDayMonth(weekInfo.weekStart);
    const endText = this.isoDateToDayMonth(weekInfo.weekEnd);
    return {
      key,
      label: `${startText}-${endText}`,
      fromIsoDate: weekInfo.weekStart,
      toIsoDate: weekInfo.weekEnd,
    };
  }

  private getIsoWeekInfo(inputDate: Date): { year: number; week: number; weekStart: string; weekEnd: string } {
    const date = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() || 7) - 1));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    return {
      year: date.getUTCFullYear(),
      week,
      weekStart: this.toIsoDate(monday),
      weekEnd: this.toIsoDate(sunday),
    };
  }

  private isPresentEntry(entry: JournalEntryEntity): boolean {
    const comment = (entry.comment ?? '').trim().toUpperCase();
    return entry.attendance !== 'absent' && comment !== 'Н';
  }

  private isDateInBounds(isoDate: string, bounds: DateBounds): boolean {
    return isoDate >= bounds.startIsoDate && isoDate <= bounds.endIsoDate;
  }

  private toIsoDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toLocalIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isoDateToDayMonth(isoDate: string): string {
    const [, month, day] = isoDate.split('-');
    return `${day}.${month}`;
  }

}

