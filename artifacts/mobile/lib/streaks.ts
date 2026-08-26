export const MILESTONES = [3, 7, 14, 30, 60, 90, 365];

export const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Formats a Date into a local calendar day key (YYYY-MM-DD).
 * The app stores workout logs under these keys.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function keyToDate(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** True when `a` is the day immediately after `b`. */
function isNextDay(a: string, b: string): boolean {
  return toDateKey(addDays(keyToDate(b), 1)) === a;
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function normalizeWeekdays(weekdays?: number[]): number[] {
  const normalized = [...new Set(weekdays ?? ALL_WEEKDAYS)].filter(
    (day) => Number.isInteger(day) && day >= 0 && day <= 6,
  );
  return normalized.length > 0
    ? normalized.sort((a, b) => a - b)
    : ALL_WEEKDAYS;
}

function isScheduledDate(key: string, weekdays: number[]): boolean {
  return weekdays.includes(keyToDate(key).getDay());
}

function previousScheduledDate(key: string, weekdays: number[]): string {
  let date = addDays(keyToDate(key), -1);
  while (!isScheduledDate(toDateKey(date), weekdays)) {
    date = addDays(date, -1);
  }
  return toDateKey(date);
}

function isPreviousScheduledDate(
  currentKey: string,
  previousKey: string,
  weekdays: number[],
): boolean {
  return previousScheduledDate(currentKey, weekdays) === previousKey;
}

/**
 * Returns the set of unique workout day keys from a list of logs.
 * Multiple logs on the same day count as a single workout day.
 */
export function getActiveDates(logs: { date: string }[]): Set<string> {
  const active = new Set<string>();
  for (const log of logs) {
    if (typeof log.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
      active.add(log.date);
    }
  }
  return active;
}

/** Longest run of consecutive days in `keys` (keys assumed sorted ascending). */
function longestRun(sortedKeys: string[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < sortedKeys.length; i++) {
    if (i > 0 && isNextDay(sortedKeys[i]!, sortedKeys[i - 1]!)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }
  return best;
}

export interface StreakInfo {
  /** Consecutive workout days ending today (or yesterday when the streak is still alive). */
  current: number;
  /** Longest consecutive workout-day run on record. */
  best: number;
  /** True when the streak is still alive but today hasn't been logged yet. */
  atRisk: boolean;
  /** The most recent workout day key, or null when there are none. */
  lastWorkout: string | null;
}

/**
 * Computes current/best streak from workout day keys.
 * - Logged today  -> current counts the run ending today.
 * - Logged yesterday but not today -> current counts the run ending yesterday and atRisk=true.
 * - Otherwise -> current = 0.
 * Future-dated keys are ignored for streak math.
 */
export function calcStreak(
  activeDates: Set<string>,
  todayKey: string = getTodayKey(),
  weekdays?: number[],
): StreakInfo {
  const schedule = normalizeWeekdays(weekdays);
  const today = new Date(todayKey);
  const yesterdayKey = toDateKey(addDays(today, -1));
  const lastWorkoutKey = toDateKey(addDays(today, 1));

  const keys: string[] = [];
  for (const key of activeDates) {
    if (key <= lastWorkoutKey) keys.push(key);
  }
  keys.sort();
  const scheduledKeys = keys.filter((key) => isScheduledDate(key, schedule));

  let current = 0;
  const todayIsScheduled = isScheduledDate(todayKey, schedule);
  let atRisk = todayIsScheduled && !activeDates.has(todayKey);

  const startKey =
    todayIsScheduled && activeDates.has(todayKey)
      ? todayKey
      : previousScheduledDate(todayKey, schedule);
  if (activeDates.has(startKey)) {
    let cursorKey = startKey;
    while (activeDates.has(cursorKey)) {
      current += 1;
      cursorKey = previousScheduledDate(cursorKey, schedule);
    }
  }

  let best = 0;
  let run = 0;
  for (let index = 0; index < scheduledKeys.length; index += 1) {
    if (
      index > 0 &&
      isPreviousScheduledDate(
        scheduledKeys[index]!,
        scheduledKeys[index - 1]!,
        schedule,
      )
    ) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }

  return {
    current,
    best,
    atRisk,
    lastWorkout: keys.length > 0 ? keys[keys.length - 1]! : null,
  };
}

/** Milestones at or below the given streak length. */
export function getEarnedMilestones(streakLength: number): number[] {
  return MILESTONES.filter((m) => streakLength >= m);
}

/** Group consecutive-day keys into runs (for calendar/timeline display). */
export function getStreakRuns(activeDates: Set<string>): string[][] {
  const sorted = [...activeDates].sort();
  const runs: string[][] = [];
  let currentRun: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const key = sorted[i]!;
    if (i > 0 && isNextDay(key, sorted[i - 1]!)) {
      currentRun.push(key);
    } else {
      if (currentRun.length > 0) runs.push(currentRun);
      currentRun = [key];
    }
  }
  if (currentRun.length > 0) runs.push(currentRun);
  return runs;
}
