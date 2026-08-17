import type { WorkoutLog } from "@/types/workout";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  const d = startOfWeek(date);
  return d.toISOString().slice(0, 10);
}

function weeksBetween(a: Date, b: Date): number {
  const msWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msWeek) + 1;
}

export function calcConsistency(logs: WorkoutLog[]) {
  if (logs.length === 0) {
    return { percentage: 0, workoutWeeks: 0, totalWeeks: 0 };
  }

  const activeWeeks = new Set<string>();
  let earliest = startOfWeek(new Date(logs[0]!.date));

  for (const log of logs) {
    const d = new Date(log.date);
    if (d < earliest) earliest = startOfWeek(d);
    activeWeeks.add(weekKey(d));
  }

  const now = startOfWeek(new Date());
  const totalWeeks = weeksBetween(earliest, now);
  const workoutWeeks = activeWeeks.size;

  return {
    percentage: Math.round((workoutWeeks / totalWeeks) * 100),
    workoutWeeks,
    totalWeeks,
  };
}

export interface ExerciseProgressPoint {
  weekLabel: string;
  bestWeight: number;
  bestReps: number;
  date: string;
}

export function getExerciseProgress(
  logs: WorkoutLog[],
  exerciseId: string,
): ExerciseProgressPoint[] {
  const weekMap = new Map<
    string,
    { bestWeight: number; bestReps: number; date: string; weekStart: Date }
  >();

  for (const log of logs) {
    for (const entry of log.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      for (const set of entry.sets) {
        if (!set.weight) continue;
        const d = new Date(log.date);
        const wk = weekKey(d);
        const existing = weekMap.get(wk);
        if (!existing || set.weight > existing.bestWeight) {
          weekMap.set(wk, {
            bestWeight: set.weight,
            bestReps: set.reps ?? 0,
            date: log.date,
            weekStart: startOfWeek(d),
          });
        }
      }
    }
  }

  return [...weekMap.values()]
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map((v) => ({
      weekLabel: v.weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      bestWeight: v.bestWeight,
      bestReps: v.bestReps,
      date: v.date,
    }));
}

export interface TopExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sessions: number;
}

export function getTopExercises(
  logs: WorkoutLog[],
  limit = 8,
): TopExercise[] {
  const countMap = new Map<string, { name: string; muscleGroup: string; count: number }>();

  for (const log of logs) {
    for (const entry of log.entries) {
      const existing = countMap.get(entry.exerciseId);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(entry.exerciseId, {
          name: entry.exerciseName,
          muscleGroup: entry.muscleGroup,
          count: 1,
        });
      }
    }
  }

  return [...countMap.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      muscleGroup: v.muscleGroup,
      sessions: v.count,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}
