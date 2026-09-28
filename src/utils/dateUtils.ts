import { FuzzyDate, EndDateSource } from '../types/anilist.ts';

type ResolvedDate = { date: FuzzyDate | null; source: EndDateSource };

export function resolveEffectiveEndDate(
  endDate: FuzzyDate | null | undefined,
  startDate: FuzzyDate | null | undefined,
  airingStatus: string | null | undefined,
  listStatus: string
): ResolvedDate {
  if (endDate?.year) {
    return { date: endDate, source: 'endDate' };
  } else if (airingStatus === 'RELEASING' || listStatus === 'CURRENT' || listStatus === 'REPEATING') {
    return { date: todayAsFuzzyDate(), source: 'today' };
  } else if (startDate?.year) {
    return { date: startDate, source: 'startDate' };
  } else {
    return { date: null, source: 'unknown' };
  }
}

export function fuzzyDateToDate(f: FuzzyDate | null | undefined): Date | null {
  if (!f || !f.year) return null;
  return new Date(f.year, (f.month || 1) - 1, f.day || 1);
}

export function dateDiffDays(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function fuzzyDateLabel(f: FuzzyDate | null | undefined): string {
  if (!f || !f.year) return '—';
  const y = f.year;
  const m = f.month ? String(f.month).padStart(2, '0') : '??';
  const d = f.day ? String(f.day).padStart(2, '0') : '??';
  return `${y}-${m}-${d}`;
}

export function todayAsFuzzyDate(): FuzzyDate {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate()
  };
}

export function fuzzyDateToInputString(f: FuzzyDate | null | undefined): string {
  if (!f || !f.year) return '';
  const y = String(f.year).padStart(4, '0');
  const m = String(f.month || 1).padStart(2, '0');
  const d = String(f.day || 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function inputStringToFuzzyDate(val: string): FuzzyDate | null {
  if (!val) return null;
  const parts = val.split('-');
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

export function stepFuzzyDateYear(
  date: FuzzyDate | null | undefined,
  delta: number,
  fallback?: FuzzyDate | null
): FuzzyDate {
  let base = date;
  if (!base || !base.year) {
    if (fallback && fallback.year) {
      base = {
        year: fallback.year,
        month: fallback.month || 1,
        day: fallback.day || 1
      };
    } else {
      const today = new Date();
      base = {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate()
      };
    }
  }

  const nextYear = (base.year || new Date().getFullYear()) + delta;
  const month = base.month || 1;
  const maxDay = new Date(nextYear, month, 0).getDate();
  const day = Math.min(base.day || 1, maxDay);

  return {
    year: nextYear,
    month,
    day
  };
}

export function formatDiscrepancyPretty(days: number | null | undefined): string {
  if (days === null || days === undefined) return '—';
  const absDays = Math.abs(days);
  const totalMonths = Math.round(absDays / 30.4375);

  if (totalMonths === 0) {
    return '< 1 mo';
  }

  const sign = days >= 0 ? '+' : '-';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return `${sign}${months} mo`;
  }

  if (months === 0) {
    return `${sign}${years}y`;
  }

  return `${sign}${years}y ${months}mo`;
}

export function unixTimestampToFuzzyDate(timestamp: number | null | undefined): FuzzyDate | null {
  if (!timestamp || timestamp <= 0 || isNaN(timestamp)) {
    return null;
  }
  const d = new Date(timestamp * 1000);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) {
    return null;
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate()
  };
}
