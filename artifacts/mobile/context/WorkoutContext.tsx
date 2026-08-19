import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_EXERCISES } from "@/data/defaultExercises";
import { calcStreak, getActiveDates, getTodayKey } from "@/lib/streaks";
import type { StreakInfo } from "@/lib/streaks";
import type {
  Exercise,
  Routine,
  SetEntry,
  UserProfile,
  WeightEntry,
  WorkoutEntry,
  WorkoutLog,
} from "@/types/workout";

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

const getTodayDate = () => getTodayKey();

const normalizeDateKey = (value?: string) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return getTodayDate();
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  onboardingComplete: false,
  selectedRoutineType: null,
  weightUnit: "kg",
  targetWeight: null,
  weightGoalType: null,
};

const PROFILE_TABLE = "user_profiles";
const EXERCISES_TABLE = "exercises";
const WORKOUT_LOGS_TABLE = "workout_logs";
const WORKOUT_ENTRIES_TABLE = "workout_entries";
const WORKOUT_SETS_TABLE = "workout_sets";
const ROUTINES_TABLE = "routines";
const ROUTINE_EXERCISES_TABLE = "routine_exercises";
const WEIGHT_ENTRIES_TABLE = "weight_entries";

interface WorkoutSyncPayload {
  profile: UserProfile;
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  routines: Routine[];
  weightLogs: WeightEntry[];
}

interface PersistOptions {
  allowDeletions?: boolean;
}

const buildUserProfile = (user: {
  user_metadata?: any;
  email?: string;
}): UserProfile => {
  const givenName = user.user_metadata?.given_name ?? "";
  const familyName = user.user_metadata?.family_name ?? "";
  return {
    ...DEFAULT_PROFILE,
    name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.email ??
      (givenName || familyName ? `${givenName} ${familyName}`.trim() : "") ??
      user.email ??
      "",
  };
};

const describeSupabaseError = (error: unknown) => {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: string }).message);
  }
  return String(error);
};

const safeSyncTable = async (
  tableName: string,
  operation: () => Promise<unknown>,
) => {
  try {
    await operation();
  } catch (error) {
    console.warn(
      `[WorkoutContext] ${tableName} sync skipped:`,
      describeSupabaseError(error),
    );
  }
};

const deleteMissingRowsForUser = async (
  tableName: string,
  userId: string,
  currentIds: string[],
) => {
  const { data, error } = await supabase
    .from(tableName)
    .select("id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const existingIds = (data ?? []).map((row: any) => String(row.id));
  const idsToDelete = existingIds.filter((id) => !currentIds.includes(id));

  if (idsToDelete.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    throw deleteError;
  }
};

const buildExerciseId = (userId: string, seed: string) => {
  const sanitized = seed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `ex_${userId.replace(/[^a-z0-9]+/gi, "")}_${sanitized}`;
};

const seedDefaultExercisesForUser = (userId: string): Exercise[] =>
  DEFAULT_EXERCISES.map((exercise, index) => ({
    ...exercise,
    id: buildExerciseId(userId, exercise.name || `exercise-${index}`),
    isCustom: false,
  }));

const DEFAULT_EXERCISES_BY_NAME = new Map<string, Exercise>(
  DEFAULT_EXERCISES.map((exercise) => [
    exercise.name.toLowerCase(),
    exercise,
  ]),
);

const mapExercise = (row: any): Exercise => {
  const canonical =
    !row.is_custom
      ? DEFAULT_EXERCISES_BY_NAME.get(
          String(row.name ?? "").trim().toLowerCase(),
        )
      : undefined;
  return {
    id: row.id,
    name: row.name || "Exercise",
    muscleGroup:
      canonical?.muscleGroup ??
      row.muscle_group ??
      row.muscleGroup ??
      "CORE",
    equipment: canonical?.equipment ?? row.equipment ?? "Bodyweight",
    measurementUnit:
      canonical?.measurementUnit ??
      (row.measurement_unit === "Duration"
        ? "Duration"
        : row.measurement_unit ?? row.measurementUnit ?? "Weight & Reps"),
    instructions: canonical?.instructions ?? row.instructions ?? undefined,
    isCustom: row.is_custom ?? false,
  };
};

const mapWorkoutSet = (row: any): SetEntry => ({
  setNumber: Number(row.set_number),
  weight: row.weight !== null ? Number(row.weight) : undefined,
  reps: row.reps !== null ? Number(row.reps) : undefined,
  duration: row.duration !== null ? Number(row.duration) : undefined,
  durationUnit: row.duration_unit === "minutes" ? "minutes" : "seconds",
});

const mapWorkoutEntry = (row: any): WorkoutEntry => {
  const canonical = DEFAULT_EXERCISES_BY_NAME.get(
    String(row.exercise_name ?? "").trim().toLowerCase(),
  );
  return {
    id: row.id,
    exerciseId: row.exercise_id ?? "",
    exerciseName: row.exercise_name || "Exercise",
    muscleGroup:
      canonical?.muscleGroup ?? row.muscle_group ?? row.muscleGroup ?? "CORE",
    equipment: canonical?.equipment ?? row.equipment ?? "Bodyweight",
    timestamp: row.timestamp,
    sets: Array.isArray(row.workout_sets)
      ? row.workout_sets.map(mapWorkoutSet)
      : [],
  };
};

const mapRoutine = (row: any): Routine => ({
  id: row.id,
  name: row.name,
  type: row.type,
  exercises: Array.isArray(row.routine_exercises)
    ? row.routine_exercises.map((exerciseRow: any) => {
        const canonical = DEFAULT_EXERCISES_BY_NAME.get(
          String(exerciseRow.exercise_name ?? "").trim().toLowerCase(),
        );
        return {
          exerciseId: exerciseRow.exercise_id,
          exerciseName: exerciseRow.exercise_name || "Exercise",
          muscleGroup:
            canonical?.muscleGroup ??
            exerciseRow.muscle_group ??
            "CORE",
          targetSets: Number(exerciseRow.target_sets) || 3,
        };
      })
    : [],
});

const mapWeightEntry = (row: any): WeightEntry => ({
  id: row.id,
  weight: Number(row.weight),
  timestamp: row.timestamp,
  date: String(row.date),
});

interface WorkoutContextValue {
  loading: boolean;
  profile: UserProfile;
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  routines: Routine[];
  weightLogs: WeightEntry[];
  todayLog: WorkoutLog | null;
  streak: number;
  streakInfo: StreakInfo;
  totalVolumeToday: number;
  lastWeight: number | null;
  weeklyWeightChange: number | null;
  weightGoalDirection: "loss" | "gain" | null;
  weightDeltaToGoal: number | null;
  weightGoalProgress: number | null;
  isReady: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, "id" | "isCustom">) => Promise<void>;
  updateExercise: (
    exerciseId: string,
    updates: Partial<Omit<Exercise, "id">>,
  ) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;
  addWorkoutEntry: (
    entry: Omit<WorkoutEntry, "id" | "timestamp">,
    selectedDate?: string,
  ) => Promise<void>;
  updateWorkoutEntry: (entryId: string, sets: SetEntry[]) => Promise<void>;
  deleteWorkoutEntry: (entryId: string) => Promise<void>;
  deleteWorkoutLog: (logId: string) => Promise<void>;
  getEntryById: (entryId: string) => WorkoutEntry | null;
  getLogById: (logId: string) => WorkoutLog | null;
  getLastEntryForExercise: (exerciseId: string) => WorkoutEntry | null;
  getSessionsForExercise: (exerciseId: string) => WorkoutEntry[];
  getBestSetForExercise: (exerciseId: string) => SetEntry | null;
  addRoutine: (routine: Omit<Routine, "id">) => Promise<void>;
  addWeightEntry: (weight: number, selectedDate?: string) => Promise<void>;
  deleteWeightEntry: (id: string) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>([]);
  const hasCompletedServerHydrationRef = useRef(false);

  const persistStateToSupabase = useCallback(
    async (
      userId: string,
      payload: WorkoutSyncPayload,
      options?: PersistOptions,
    ) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUserId = sessionData?.session?.user?.id ?? null;
      const { data: userData } = await supabase.auth.getUser();
      const resolvedUserId = userData?.user?.id ?? sessionUserId ?? userId;
      const allowDeletions =
        options?.allowDeletions ?? hasCompletedServerHydrationRef.current;

      if (!resolvedUserId) {
        console.warn("[WorkoutContext] Sync skipped — no active session.");
        return;
      }

      if (sessionUserId && sessionUserId !== userId) {
        console.warn("[WorkoutContext] Sync user ID mismatch.", {
          provided: userId,
          session: sessionUserId,
        });
      }

      const persistedUserId = resolvedUserId;

      await safeSyncTable(PROFILE_TABLE, async () => {
        const { error } = await supabase.from(PROFILE_TABLE).upsert(
          {
            user_id: persistedUserId,
            name: payload.profile.name,
            onboarding_complete: payload.profile.onboardingComplete,
            selected_routine_type: payload.profile.selectedRoutineType,
            weight_unit: payload.profile.weightUnit,
            target_weight: payload.profile.targetWeight,
            weight_goal_type: payload.profile.weightGoalType,
          },
          { onConflict: "user_id" },
        );
        if (error) {
          throw error;
        }
      });

      const exerciseRows = payload.exercises
        .filter((exercise) => Boolean(exercise.id))
        .map((exercise) => ({
          id: exercise.id,
          user_id: persistedUserId,
          name: exercise.name?.trim() || "Exercise",
          muscle_group: exercise.muscleGroup || "CORE",
          equipment: exercise.equipment || "Bodyweight",
          measurement_unit: exercise.measurementUnit || "Weight & Reps",
          instructions: exercise.instructions ?? null,
          is_custom: exercise.isCustom ?? false,
        }));

      await safeSyncTable(EXERCISES_TABLE, async () => {
        if (exerciseRows.length > 0) {
          const { data, error } = await supabase
            .from(EXERCISES_TABLE)
            .upsert(exerciseRows, { onConflict: "id" })
            .select();
          if (error) {
            console.error("[WorkoutContext] Exercise sync failed", {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            });
            throw error;
          }
          console.info(
            `[WorkoutContext] Synced ${data?.length ?? exerciseRows.length} exercise(s) to Supabase`,
          );
        }

        if (allowDeletions) {
          await deleteMissingRowsForUser(
            EXERCISES_TABLE,
            persistedUserId,
            exerciseRows.map((row) => String(row.id)),
          );
        }
      });

      const workoutLogRows = payload.workoutLogs.map((log) => ({
        id: log.id,
        user_id: persistedUserId,
        date: log.date,
      }));
      const workoutEntryRows = payload.workoutLogs.flatMap((log) =>
        log.entries
          .filter((entry) => Boolean(entry.id))
          .map((entry) => ({
            id: entry.id,
            workout_log_id: log.id,
            user_id: persistedUserId,
            exercise_id: entry.exerciseId ?? null,
            exercise_name: entry.exerciseName?.trim() || "Exercise",
            muscle_group: entry.muscleGroup || "CORE",
            equipment: entry.equipment || "Bodyweight",
            timestamp: entry.timestamp,
          })),
      );
      const workoutSetRows = payload.workoutLogs.flatMap((log) =>
        log.entries.flatMap((entry) =>
          entry.sets.map((set) => ({
            id: `${entry.id}-${set.setNumber}`,
            workout_entry_id: entry.id,
            user_id: persistedUserId,
            set_number: set.setNumber,
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            duration: set.duration ?? null,
            duration_unit: set.durationUnit ?? "seconds",
          })),
        ),
      );

      await safeSyncTable(WORKOUT_LOGS_TABLE, async () => {
        const { error } = await supabase
          .from(WORKOUT_LOGS_TABLE)
          .upsert(workoutLogRows, { onConflict: "id" });
        if (error) {
          throw error;
        }
        if (allowDeletions) {
          await deleteMissingRowsForUser(
            WORKOUT_LOGS_TABLE,
            persistedUserId,
            workoutLogRows.map((row) => String(row.id)),
          );
        }
      });
      await safeSyncTable(WORKOUT_ENTRIES_TABLE, async () => {
        const { error } = await supabase
          .from(WORKOUT_ENTRIES_TABLE)
          .upsert(workoutEntryRows, { onConflict: "id" });
        if (error) {
          throw error;
        }
        if (allowDeletions) {
          await deleteMissingRowsForUser(
            WORKOUT_ENTRIES_TABLE,
            persistedUserId,
            workoutEntryRows.map((row) => String(row.id)),
          );
        }
      });
      await safeSyncTable(WORKOUT_SETS_TABLE, async () => {
        const { error } = await supabase
          .from(WORKOUT_SETS_TABLE)
          .upsert(workoutSetRows, { onConflict: "id" });
        if (error) {
          throw error;
        }
        if (allowDeletions) {
          await deleteMissingRowsForUser(
            WORKOUT_SETS_TABLE,
            persistedUserId,
            workoutSetRows.map((row) => String(row.id)),
          );
        }
      });

      const routineRows = payload.routines.map((routine) => ({
        id: routine.id,
        user_id: persistedUserId,
        name: routine.name,
        type: routine.type,
      }));
      const routineExerciseRows = payload.routines.flatMap((routine) =>
        routine.exercises
          .filter((exercise) => Boolean(exercise.exerciseId))
          .map((exercise) => ({
            id: `${routine.id}-${exercise.exerciseId}`,
            routine_id: routine.id,
            user_id: persistedUserId,
            exercise_id: exercise.exerciseId,
            exercise_name: exercise.exerciseName?.trim() || "Exercise",
            muscle_group: exercise.muscleGroup || "CORE",
            target_sets:
              Number.isFinite(Number(exercise.targetSets)) && Number(exercise.targetSets) > 0
                ? exercise.targetSets
                : 3,
          })),
      );

      await safeSyncTable(ROUTINES_TABLE, async () => {
        const { error } = await supabase
          .from(ROUTINES_TABLE)
          .upsert(routineRows, { onConflict: "id" });
        if (error) {
          throw error;
        }
        if (allowDeletions) {
          await deleteMissingRowsForUser(
            ROUTINES_TABLE,
            persistedUserId,
            routineRows.map((row) => String(row.id)),
          );
        }
      });
      await safeSyncTable(ROUTINE_EXERCISES_TABLE, async () => {
        const { error } = await supabase
          .from(ROUTINE_EXERCISES_TABLE)
          .upsert(routineExerciseRows, { onConflict: "id" });
        if (error) {
          throw error;
        }
        if (allowDeletions) {
          await deleteMissingRowsForUser(
            ROUTINE_EXERCISES_TABLE,
            persistedUserId,
            routineExerciseRows.map((row) => String(row.id)),
          );
        }
      });

      const weightRows = payload.weightLogs.map((entry) => ({
        id: entry.id,
        user_id: persistedUserId,
        weight: entry.weight,
        timestamp: entry.timestamp,
        date: entry.date,
      }));

      await safeSyncTable(WEIGHT_ENTRIES_TABLE, async () => {
        const { error } = await supabase
          .from(WEIGHT_ENTRIES_TABLE)
          .upsert(weightRows, { onConflict: "id" });
        if (error) {
          throw error;
        }
        if (allowDeletions) {
          await deleteMissingRowsForUser(
            WEIGHT_ENTRIES_TABLE,
            persistedUserId,
            weightRows.map((row) => String(row.id)),
          );
        }
      });
    },
    [],
  );

  const sync = useCallback(
    (payload: WorkoutSyncPayload) => {
      if (!user?.id) {
        console.warn("[WorkoutContext] Sync skipped — no authenticated user.");
        return Promise.resolve();
      }

      return persistStateToSupabase(user.id, payload);
    },
    [persistStateToSupabase, user?.id],
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      hasCompletedServerHydrationRef.current = false;

      if (!user?.id) {
        setProfile(DEFAULT_PROFILE);
        setExercises(DEFAULT_EXERCISES);
        setWorkoutLogs([]);
        setRoutines([]);
        setWeightLogs([]);
        setLoading(false);
        setIsReady(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUserId = sessionData?.session?.user?.id ?? null;

      if (!sessionUserId) {
        console.warn(
          "[WorkoutContext] No active Supabase session — aborting load.",
        );
        setLoading(false);
        setIsReady(true);
        return;
      }

      try {
        const [
          { data: profileData, error: profileError },
          { data: exercisesData, error: exercisesError },
          { data: workoutLogsData, error: workoutLogsError },
          { data: routineRows, error: routinesError },
          { data: weightRows, error: weightError },
        ] = await Promise.all([
          supabase
            .from(PROFILE_TABLE)
            .select("*")
            .eq("user_id", sessionUserId)
            .maybeSingle(),
          supabase
            .from(EXERCISES_TABLE)
            .select("*")
            .eq("user_id", sessionUserId)
            .order("name", { ascending: true }),
          supabase
            .from(WORKOUT_LOGS_TABLE)
            .select("id, date")
            .eq("user_id", sessionUserId)
            .order("date", { ascending: false }),
          supabase
            .from(ROUTINES_TABLE)
            .select("*")
            .eq("user_id", sessionUserId)
            .order("inserted_at", { ascending: true }),
          supabase
            .from(WEIGHT_ENTRIES_TABLE)
            .select("*")
            .eq("user_id", sessionUserId)
            .order("timestamp", { ascending: false }),
        ]);

        if (
          profileError ||
          exercisesError ||
          workoutLogsError ||
          routinesError ||
          weightError
        ) {
          throw (
            profileError ||
            exercisesError ||
            workoutLogsError ||
            routinesError ||
            weightError
          );
        }

        const { data: workoutEntriesData, error: workoutEntriesError } =
          await supabase
            .from(WORKOUT_ENTRIES_TABLE)
            .select(
              "id, workout_log_id, exercise_id, exercise_name, muscle_group, equipment, timestamp, workout_sets(id, set_number, weight, reps, duration)",
            )
            .eq("user_id", sessionUserId)
            .order("timestamp", { ascending: true });

        if (workoutEntriesError) {
          throw workoutEntriesError;
        }

        const { data: routineExercisesData, error: routineExercisesError } =
          await supabase
            .from(ROUTINE_EXERCISES_TABLE)
            .select(
              "id, routine_id, exercise_id, exercise_name, muscle_group, target_sets",
            )
            .eq("user_id", sessionUserId)
            .order("inserted_at", { ascending: true });

        if (routineExercisesError) {
          throw routineExercisesError;
        }

        const googleProfile = buildUserProfile(user);
        const resolvedProfile: UserProfile = profileData
          ? {
              name: profileData.name?.trim() || googleProfile.name,
              onboardingComplete: Boolean(profileData.onboarding_complete),
              selectedRoutineType: profileData.selected_routine_type ?? null,
              weightUnit: profileData.weight_unit === "lbs" ? "lbs" : "kg",
              targetWeight:
                profileData.target_weight != null
                  ? Number(profileData.target_weight)
                  : null,
              weightGoalType:
                profileData.weight_goal_type === "loss" ||
                profileData.weight_goal_type === "gain"
                  ? profileData.weight_goal_type
                  : null,
            }
          : googleProfile;

        const fallbackExercises = seedDefaultExercisesForUser(sessionUserId);
        const normalizedExercises =
          exercisesData && exercisesData.length > 0
            ? exercisesData.map(mapExercise)
            : fallbackExercises;

        const entriesByLogId = new Map<string, any[]>();
        for (const entryRow of workoutEntriesData ?? []) {
          const preparedEntry = {
            ...entryRow,
            workout_sets: Array.isArray(entryRow.workout_sets)
              ? entryRow.workout_sets
              : [],
          };
          const existing = entriesByLogId.get(entryRow.workout_log_id) ?? [];
          existing.push(preparedEntry);
          entriesByLogId.set(entryRow.workout_log_id, existing);
        }

        const normalizedLogs = (workoutLogsData ?? []).map((logRow: any) => ({
          id: logRow.id,
          date: String(logRow.date),
          entries: (entriesByLogId.get(logRow.id) ?? []).map(mapWorkoutEntry),
        }));

        const routineExercisesByRoutineId = new Map<string, any[]>();
        for (const routineExerciseRow of routineExercisesData ?? []) {
          const existing =
            routineExercisesByRoutineId.get(routineExerciseRow.routine_id) ??
            [];
          existing.push(routineExerciseRow);
          routineExercisesByRoutineId.set(
            routineExerciseRow.routine_id,
            existing,
          );
        }

        const normalizedRoutines = (routineRows ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          exercises: (routineExercisesByRoutineId.get(row.id) ?? []).map(
            (exerciseRow: any) => ({
              exerciseId: exerciseRow.exercise_id,
              exerciseName: exerciseRow.exercise_name,
              muscleGroup: exerciseRow.muscle_group,
              targetSets: Number(exerciseRow.target_sets),
            }),
          ),
        }));

        const normalizedWeightLogs = (weightRows ?? []).map(mapWeightEntry);

        setProfile(resolvedProfile);
        setExercises(normalizedExercises);
        setWorkoutLogs(normalizedLogs);
        setRoutines(normalizedRoutines);
        setWeightLogs(normalizedWeightLogs);

        if (!profileData) {
          await persistStateToSupabase(
            sessionUserId,
            {
              profile: resolvedProfile,
              exercises: normalizedExercises,
              workoutLogs: normalizedLogs,
              routines: normalizedRoutines,
              weightLogs: normalizedWeightLogs,
            },
            {
              allowDeletions: false,
            },
          );
        }

        if (!exercisesData?.length) {
          await persistStateToSupabase(
            sessionUserId,
            {
              profile: resolvedProfile,
              exercises: normalizedExercises,
              workoutLogs: normalizedLogs,
              routines: normalizedRoutines,
              weightLogs: normalizedWeightLogs,
            },
            {
              allowDeletions: false,
            },
          );
        }

        hasCompletedServerHydrationRef.current = true;
      } catch (error) {
        console.error("[WorkoutContext] Unexpected error during load:", error);
      } finally {
        setLoading(false);
        setIsReady(true);
      }
    };

    void loadData();
  }, [persistStateToSupabase, user?.id]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        const updatedProfile = { ...prev, ...updates };
        void sync({
          profile: updatedProfile,
          exercises,
          workoutLogs,
          routines,
          weightLogs,
        });
        return updatedProfile;
      });
    },
    [exercises, routines, sync, weightLogs, workoutLogs],
  );

  const addExercise = useCallback(
    async (exercise: Omit<Exercise, "id" | "isCustom">) => {
      const newExercise: Exercise = {
        ...exercise,
        id: generateId(),
        isCustom: true,
      };
      const updatedExercises = [...exercises, newExercise];
      setExercises(updatedExercises);
      await sync({
        profile,
        exercises: updatedExercises,
        workoutLogs,
        routines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, updates: Partial<Omit<Exercise, "id">>) => {
      const updatedExercises = exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex,
      );
      setExercises(updatedExercises);
      await sync({
        profile,
        exercises: updatedExercises,
        workoutLogs,
        routines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      const targetExercise = exercises.find(
        (exercise) => exercise.id === exerciseId,
      );

      if (!targetExercise || !targetExercise.isCustom) {
        return;
      }

      const updatedExercises = exercises.filter(
        (exercise) => exercise.id !== exerciseId,
      );
      const updatedRoutines = routines.map((routine) => ({
        ...routine,
        exercises: routine.exercises.filter(
          (routineExercise) => routineExercise.exerciseId !== exerciseId,
        ),
      }));

      setExercises(updatedExercises);
      setRoutines(updatedRoutines);
      await sync({
        profile,
        exercises: updatedExercises,
        workoutLogs,
        routines: updatedRoutines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const addWorkoutEntry = useCallback(
    async (
      entry: Omit<WorkoutEntry, "id" | "timestamp">,
      selectedDate?: string,
    ) => {
      const normalizedDate = normalizeDateKey(selectedDate);
      const newEntry: WorkoutEntry = {
        ...entry,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };

      let updatedLogs: WorkoutLog[];
      const targetLogIdx = workoutLogs.findIndex(
        (l) => l.date === normalizedDate,
      );

      if (targetLogIdx >= 0) {
        updatedLogs = workoutLogs.map((log, i) =>
          i === targetLogIdx
            ? { ...log, entries: [...log.entries, newEntry] }
            : log,
        );
      } else {
        updatedLogs = [
          { id: generateId(), date: normalizedDate, entries: [newEntry] },
          ...workoutLogs,
        ];
      }

      setWorkoutLogs(updatedLogs);
      await sync({
        profile,
        exercises,
        workoutLogs: updatedLogs,
        routines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const updateWorkoutEntry = useCallback(
    async (entryId: string, sets: SetEntry[]) => {
      const updatedLogs = workoutLogs.map((log) => ({
        ...log,
        entries: log.entries.map((e) =>
          e.id === entryId ? { ...e, sets } : e,
        ),
      }));
      setWorkoutLogs(updatedLogs);
      await sync({
        profile,
        exercises,
        workoutLogs: updatedLogs,
        routines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const deleteWorkoutEntry = useCallback(
    async (entryId: string) => {
      const updatedLogs = workoutLogs
        .map((log) => ({
          ...log,
          entries: log.entries.filter((e) => e.id !== entryId),
        }))
        .filter((log) => log.entries.length > 0);
      setWorkoutLogs(updatedLogs);
      await sync({
        profile,
        exercises,
        workoutLogs: updatedLogs,
        routines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const deleteWorkoutLog = useCallback(
    async (logId: string) => {
      const updatedLogs = workoutLogs.filter((log) => log.id !== logId);
      setWorkoutLogs(updatedLogs);
      await sync({
        profile,
        exercises,
        workoutLogs: updatedLogs,
        routines,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const getEntryById = useCallback(
    (entryId: string): WorkoutEntry | null => {
      for (const log of workoutLogs) {
        const entry = log.entries.find((e) => e.id === entryId);
        if (entry) return entry;
      }
      return null;
    },
    [workoutLogs],
  );

  const getLogById = useCallback(
    (logId: string): WorkoutLog | null =>
      workoutLogs.find((l) => l.id === logId) ?? null,
    [workoutLogs],
  );

  const getLastEntryForExercise = useCallback(
    (exerciseId: string): WorkoutEntry | null => {
      const today = getTodayDate();
      for (const log of workoutLogs) {
        if (log.date === today) continue;
        const entry = log.entries.find((e) => e.exerciseId === exerciseId);
        if (entry) return entry;
      }
      return null;
    },
    [workoutLogs],
  );

  const getSessionsForExercise = useCallback(
    (exerciseId: string): WorkoutEntry[] => {
      const today = getTodayDate();
      return workoutLogs
        .filter((log) => log.date !== today)
        .flatMap((log) =>
          log.entries.filter((entry) => entry.exerciseId === exerciseId),
        )
        .sort((a, b) =>
          String(b.timestamp).localeCompare(String(a.timestamp)),
        );
    },
    [workoutLogs],
  );

  const getBestSetForExercise = useCallback(
    (exerciseId: string): SetEntry | null => {
      let bestSet: SetEntry | null = null;
      for (const log of workoutLogs) {
        for (const entry of log.entries) {
          if (entry.exerciseId !== exerciseId) continue;
          for (const set of entry.sets) {
            if (!set.weight) continue;
            if (!bestSet || (bestSet.weight ?? 0) < set.weight) bestSet = set;
          }
        }
      }
      return bestSet;
    },
    [workoutLogs],
  );

  const addRoutine = useCallback(
    async (routine: Omit<Routine, "id">) => {
      const newRoutine: Routine = { ...routine, id: generateId() };
      const updated = [...routines, newRoutine];
      setRoutines(updated);
      await sync({
        profile,
        exercises,
        workoutLogs,
        routines: updated,
        weightLogs,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const addWeightEntry = useCallback(
    async (weight: number, selectedDate?: string) => {
      const now = new Date();
      const newEntry: WeightEntry = {
        id: generateId(),
        weight,
        timestamp: now.toISOString(),
        date: normalizeDateKey(selectedDate),
      };
      const updated = [newEntry, ...weightLogs];
      setWeightLogs(updated);
      await sync({
        profile,
        exercises,
        workoutLogs,
        routines,
        weightLogs: updated,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const deleteWeightEntry = useCallback(
    async (id: string) => {
      const updated = weightLogs.filter((e) => e.id !== id);
      setWeightLogs(updated);
      await sync({
        profile,
        exercises,
        workoutLogs,
        routines,
        weightLogs: updated,
      });
    },
    [exercises, profile, routines, sync, weightLogs, workoutLogs],
  );

  const todayLog = useMemo(() => {
    const today = getTodayDate();
    return workoutLogs.find((l) => l.date === today) ?? null;
  }, [workoutLogs]);

  const streakInfo = useMemo(
    () => calcStreak(getActiveDates(workoutLogs)),
    [workoutLogs],
  );

  const streak = streakInfo.current;

  const totalVolumeToday = useMemo(() => {
    if (!todayLog) return 0;
    return todayLog.entries.reduce(
      (total, entry) =>
        total + entry.sets.reduce((s, set) => s + (set.weight ?? 0), 0),
      0,
    );
  }, [todayLog]);

  const lastWeight = useMemo(
    () => (weightLogs.length > 0 ? weightLogs[0]!.weight : null),
    [weightLogs],
  );

  const weeklyWeightChange = useMemo(() => {
    if (weightLogs.length < 2) return null;
    const latest = weightLogs[0]!;
    const sevenDaysAgo = new Date(latest.timestamp);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const baseline = weightLogs.find(
      (e) => new Date(e.timestamp) <= sevenDaysAgo,
    );
    if (!baseline) return null;
    return Math.round((latest.weight - baseline.weight) * 10) / 10;
  }, [weightLogs]);

  const weightGoalDirection: "loss" | "gain" | null = useMemo(() => {
    return profile.weightGoalType ?? null;
  }, [profile.weightGoalType]);

  const weightDeltaToGoal: number | null = useMemo(() => {
    if (lastWeight == null || profile.targetWeight == null) return null;
    return Math.round((lastWeight - profile.targetWeight) * 10) / 10;
  }, [lastWeight, profile.targetWeight]);

  const weightGoalProgress: number | null = useMemo(() => {
    if (
      lastWeight == null ||
      profile.targetWeight == null ||
      profile.weightGoalType == null ||
      weightLogs.length < 2
    )
      return null;
    const startWeight = weightLogs[weightLogs.length - 1]!.weight;
    const totalDistance = Math.abs(profile.targetWeight - startWeight);
    if (totalDistance === 0) return 100;
    const covered = Math.abs(startWeight - lastWeight);
    return Math.min(Math.round((covered / totalDistance) * 100), 100);
  }, [lastWeight, profile.targetWeight, profile.weightGoalType, weightLogs]);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      loading,
      profile,
      exercises,
      workoutLogs,
      routines,
      weightLogs,
      todayLog,
      streak,
      streakInfo,
      totalVolumeToday,
      lastWeight,
      isReady,
      weeklyWeightChange,
      weightGoalDirection,
      weightDeltaToGoal,
      weightGoalProgress,
      updateProfile,
      addExercise,
      updateExercise,
      deleteExercise,
      addWorkoutEntry,
      updateWorkoutEntry,
      deleteWorkoutEntry,
      deleteWorkoutLog,
      getEntryById,
      getLogById,
      getLastEntryForExercise,
      getSessionsForExercise,
      getBestSetForExercise,
      addRoutine,
      addWeightEntry,
      deleteWeightEntry,
    }),
    [
      addExercise,
      addRoutine,
      addWeightEntry,
      addWorkoutEntry,
      deleteWeightEntry,
      deleteWorkoutEntry,
      deleteWorkoutLog,
      exercises,
      getBestSetForExercise,
      getEntryById,
      getLastEntryForExercise,
      getLogById,
      getSessionsForExercise,
      isReady,
      lastWeight,
      loading,
      profile,
      routines,
      streak,
      streakInfo,
      todayLog,
      totalVolumeToday,
      deleteExercise,
      updateExercise,
      updateProfile,
      updateWorkoutEntry,
      weeklyWeightChange,
      weightDeltaToGoal,
      weightGoalDirection,
      weightGoalProgress,
      weightLogs,
      workoutLogs,
    ],
  );

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
