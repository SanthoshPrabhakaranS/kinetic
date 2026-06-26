import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DEFAULT_EXERCISES } from "@/data/defaultExercises";
import type {
  Exercise,
  Routine,
  SetEntry,
  UserProfile,
  WorkoutEntry,
  WorkoutLog,
} from "@/types/workout";

const KEYS = {
  PROFILE: "@kinetic/profile",
  EXERCISES: "@kinetic/exercises",
  LOGS: "@kinetic/logs",
  ROUTINES: "@kinetic/routines",
};

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

const getTodayDate = () => new Date().toISOString().split("T")[0]!;

interface WorkoutContextValue {
  loading: boolean;
  profile: UserProfile;
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  routines: Routine[];
  todayLog: WorkoutLog | null;
  streak: number;
  totalVolumeToday: number;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, "id" | "isCustom">) => Promise<void>;
  addWorkoutEntry: (entry: Omit<WorkoutEntry, "id" | "timestamp">) => Promise<void>;
  updateWorkoutEntry: (entryId: string, sets: SetEntry[]) => Promise<void>;
  getLastEntryForExercise: (exerciseId: string) => WorkoutEntry | null;
  getBestSetForExercise: (exerciseId: string) => SetEntry | null;
  addRoutine: (routine: Omit<Routine, "id">) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    onboardingComplete: false,
    selectedRoutineType: null,
    weightUnit: "kg",
  });
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRaw, exercisesRaw, logsRaw, routinesRaw] =
          await Promise.all([
            AsyncStorage.getItem(KEYS.PROFILE),
            AsyncStorage.getItem(KEYS.EXERCISES),
            AsyncStorage.getItem(KEYS.LOGS),
            AsyncStorage.getItem(KEYS.ROUTINES),
          ]);

        if (profileRaw) setProfile(JSON.parse(profileRaw) as UserProfile);
        if (exercisesRaw) setExercises(JSON.parse(exercisesRaw) as Exercise[]);
        if (logsRaw) setWorkoutLogs(JSON.parse(logsRaw) as WorkoutLog[]);
        if (routinesRaw) setRoutines(JSON.parse(routinesRaw) as Routine[]);
      } catch (e) {
        console.error("Failed to load workout data", e);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(updated));
  }, [profile]);

  const addExercise = useCallback(
    async (exercise: Omit<Exercise, "id" | "isCustom">) => {
      const newExercise: Exercise = {
        ...exercise,
        id: generateId(),
        isCustom: true,
      };
      const updated = [...exercises, newExercise];
      setExercises(updated);
      await AsyncStorage.setItem(KEYS.EXERCISES, JSON.stringify(updated));
    },
    [exercises]
  );

  const addWorkoutEntry = useCallback(
    async (entry: Omit<WorkoutEntry, "id" | "timestamp">) => {
      const today = getTodayDate();
      const newEntry: WorkoutEntry = {
        ...entry,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };

      let updatedLogs: WorkoutLog[];
      const todayLogIdx = workoutLogs.findIndex((l) => l.date === today);

      if (todayLogIdx >= 0) {
        updatedLogs = workoutLogs.map((log, i) =>
          i === todayLogIdx
            ? { ...log, entries: [...log.entries, newEntry] }
            : log
        );
      } else {
        const newLog: WorkoutLog = {
          id: generateId(),
          date: today,
          entries: [newEntry],
        };
        updatedLogs = [newLog, ...workoutLogs];
      }

      setWorkoutLogs(updatedLogs);
      await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(updatedLogs));
    },
    [workoutLogs]
  );

  const updateWorkoutEntry = useCallback(
    async (entryId: string, sets: SetEntry[]) => {
      const updatedLogs = workoutLogs.map((log) => ({
        ...log,
        entries: log.entries.map((e) =>
          e.id === entryId ? { ...e, sets } : e
        ),
      }));
      setWorkoutLogs(updatedLogs);
      await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(updatedLogs));
    },
    [workoutLogs]
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
    [workoutLogs]
  );

  const getBestSetForExercise = useCallback(
    (exerciseId: string): SetEntry | null => {
      let bestSet: SetEntry | null = null;
      for (const log of workoutLogs) {
        for (const entry of log.entries) {
          if (entry.exerciseId !== exerciseId) continue;
          for (const set of entry.sets) {
            if (!set.weight) continue;
            if (!bestSet || (bestSet.weight ?? 0) < set.weight) {
              bestSet = set;
            }
          }
        }
      }
      return bestSet;
    },
    [workoutLogs]
  );

  const addRoutine = useCallback(
    async (routine: Omit<Routine, "id">) => {
      const newRoutine: Routine = { ...routine, id: generateId() };
      const updated = [...routines, newRoutine];
      setRoutines(updated);
      await AsyncStorage.setItem(KEYS.ROUTINES, JSON.stringify(updated));
    },
    [routines]
  );

  const todayLog = useMemo(() => {
    const today = getTodayDate();
    return workoutLogs.find((l) => l.date === today) ?? null;
  }, [workoutLogs]);

  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 1; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]!;
      if (workoutLogs.some((l) => l.date === dateStr)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [workoutLogs]);

  const totalVolumeToday = useMemo(() => {
    if (!todayLog) return 0;
    return todayLog.entries.reduce((total, entry) => {
      const entryVolume = entry.sets.reduce((setTotal, set) => {
        const weight = set.weight ?? 0;
        const reps = set.reps ?? 1;
        return setTotal + weight * reps;
      }, 0);
      return total + entryVolume;
    }, 0);
  }, [todayLog]);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      loading,
      profile,
      exercises,
      workoutLogs,
      routines,
      todayLog,
      streak,
      totalVolumeToday,
      updateProfile,
      addExercise,
      addWorkoutEntry,
      updateWorkoutEntry,
      getLastEntryForExercise,
      getBestSetForExercise,
      addRoutine,
    }),
    [
      loading,
      profile,
      exercises,
      workoutLogs,
      routines,
      todayLog,
      streak,
      totalVolumeToday,
      updateProfile,
      addExercise,
      addWorkoutEntry,
      updateWorkoutEntry,
      getLastEntryForExercise,
      getBestSetForExercise,
      addRoutine,
    ]
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
