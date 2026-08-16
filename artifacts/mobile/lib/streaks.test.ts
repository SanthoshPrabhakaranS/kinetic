import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDays,
  calcStreak,
  getActiveDates,
  getEarnedMilestones,
  getStreakRuns,
  keyToDate,
  toDateKey,
} from "./streaks.ts";

function keysToSet(keys: string[]) {
  return new Set(keys);
}

test("toDateKey returns local calendar day", () => {
  const date = new Date(2026, 6, 15, 23, 30);
  assert.equal(toDateKey(date), "2026-07-15");
});

test("keyToDate / toDateKey round trip", () => {
  assert.equal(toDateKey(keyToDate("2026-07-15")), "2026-07-15");
});

test("addDays crosses month boundaries", () => {
  const base = keyToDate("2026-07-31");
  assert.equal(toDateKey(addDays(base, 1)), "2026-08-01");
  assert.equal(toDateKey(addDays(base, -1)), "2026-07-30");
});

test("getActiveDates dedupes multiple logs per day", () => {
  const active = getActiveDates([
    { date: "2026-07-10" },
    { date: "2026-07-10" },
    { date: "2026-07-11" },
    { date: "" },
    { date: "garbage" },
  ]);
  assert.equal(active.size, 2);
  assert.ok(active.has("2026-07-10"));
  assert.ok(active.has("2026-07-11"));
});

test("empty history -> zero streak", () => {
  const info = calcStreak(new Set(), "2026-07-15");
  assert.deepEqual(info, {
    current: 0,
    best: 0,
    atRisk: false,
    lastWorkout: null,
  });
});

test("worked out today -> current counts run ending today", () => {
  const active = keysToSet(["2026-07-13", "2026-07-14", "2026-07-15"]);
  const info = calcStreak(active, "2026-07-15");
  assert.equal(info.current, 3);
  assert.equal(info.best, 3);
  assert.equal(info.atRisk, false);
  assert.equal(info.lastWorkout, "2026-07-15");
});

test("worked out yesterday but not today -> streak alive and at risk", () => {
  const active = keysToSet(["2026-07-13", "2026-07-14"]);
  const info = calcStreak(active, "2026-07-15");
  assert.equal(info.current, 2);
  assert.equal(info.best, 2);
  assert.equal(info.atRisk, true);
  assert.equal(info.lastWorkout, "2026-07-14");
});

test("gap breaks the current streak", () => {
  const active = keysToSet(["2026-07-10", "2026-07-12", "2026-07-13", "2026-07-14"]);
  const info = calcStreak(active, "2026-07-15");
  assert.equal(info.current, 3);
  assert.equal(info.best, 3);
});

test("best is tracked even when current is broken", () => {
  const active = keysToSet([
    "2026-05-01",
    "2026-05-02",
    "2026-05-03",
    "2026-05-04",
    "2026-07-14",
  ]);
  const info = calcStreak(active, "2026-07-15");
  assert.equal(info.current, 1);
  assert.equal(info.best, 4);
  assert.equal(info.atRisk, true);
});

test("future-dated logs are ignored", () => {
  const active = keysToSet(["2026-07-14", "2026-08-20", "2026-08-21"]);
  const info = calcStreak(active, "2026-07-15");
  assert.equal(info.current, 1);
  assert.equal(info.best, 1);
  assert.equal(info.lastWorkout, "2026-07-14");
});

test("not logged today and not yesterday -> current zero, not at risk", () => {
  const active = keysToSet(["2026-07-01"]);
  const info = calcStreak(active, "2026-07-15");
  assert.equal(info.current, 0);
  assert.equal(info.atRisk, false);
});

test("getEarnedMilestones only returns achieved milestones", () => {
  assert.deepEqual(getEarnedMilestones(0), []);
  assert.deepEqual(getEarnedMilestones(3), [3]);
  assert.deepEqual(getEarnedMilestones(30), [3, 7, 14, 30]);
  assert.deepEqual(getEarnedMilestones(365), [3, 7, 14, 30, 60, 90, 365]);
});

test("getStreakRuns groups consecutive days", () => {
  const runs = getStreakRuns(
    keysToSet(["2026-07-10", "2026-07-11", "2026-07-12", "2026-07-15", "2026-07-16"]),
  );
  assert.deepEqual(runs, [
    ["2026-07-10", "2026-07-11", "2026-07-12"],
    ["2026-07-15", "2026-07-16"],
  ]);
});
