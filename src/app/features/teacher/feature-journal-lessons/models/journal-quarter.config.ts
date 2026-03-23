export type JournalQuarterId = 'q1' | 'q2';

export interface JournalQuarterOption {
  id: JournalQuarterId;
  label: string;
}

interface QuarterRule {
  startMonth: number;
  startDay: number;
  startYearOffset: number;
  endMonth: number;
  endDay: number;
  endYearOffset: number;
}

const QUARTER_RULES: Record<JournalQuarterId, QuarterRule> = {
  q1: {
    startMonth: 9,
    startDay: 1,
    startYearOffset: 0,
    endMonth: 12,
    endDay: 20,
    endYearOffset: 0,
  },
  q2: {
    startMonth: 1,
    startDay: 12,
    startYearOffset: 1,
    endMonth: 5,
    endDay: 25,
    endYearOffset: 1,
  },
};

export const JOURNAL_QUARTER_OPTIONS: JournalQuarterOption[] = [
  { id: 'q1', label: '1 четверть' },
  { id: 'q2', label: '2 четверть' },
];

export interface QuarterBounds {
  startIsoDate: string;
  endIsoDate: string;
}

export function resolveAcademicStartYear(lessonDates: string[]): number {
  if (!lessonDates.length) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? year : year - 1;
  }

  const minDate = [...lessonDates].sort()[0];
  const [year, month] = minDate.split('-').map(Number);
  return month >= 9 ? year : year - 1;
}

export function getQuarterBounds(quarter: JournalQuarterId, academicStartYear: number): QuarterBounds {
  const rule = QUARTER_RULES[quarter];

  const startYear = academicStartYear + rule.startYearOffset;
  const endYear = academicStartYear + rule.endYearOffset;

  return {
    startIsoDate: toIsoDate(startYear, rule.startMonth, rule.startDay),
    endIsoDate: toIsoDate(endYear, rule.endMonth, rule.endDay),
  };
}

export function isDateWithinQuarter(isoDate: string, bounds: QuarterBounds): boolean {
  return isoDate >= bounds.startIsoDate && isoDate <= bounds.endIsoDate;
}

export function listIsoDatesInRange(bounds: QuarterBounds): string[] {
  const result: string[] = [];
  const cursor = new Date(`${bounds.startIsoDate}T00:00:00`);
  const end = new Date(`${bounds.endIsoDate}T00:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    result.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function toIsoDate(year: number, month: number, day: number): string {
  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}
