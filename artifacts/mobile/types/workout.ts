export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "SHOULDERS"
  | "ARMS"
  | "CORE"
  | "GLUTES"
  | "CARDIO";

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Machine"
  | "Bodyweight"
  | "Kettlebell"
  | "Cable";

export type MeasurementUnit = "Weight & Reps" | "Reps Only" | "Duration";

export type RoutineType = "push-pull-legs" | "full-body" | "custom";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  measurementUnit: MeasurementUnit;
  instructions?: string;
  isCustom?: boolean;
}

export interface SetEntry {
  setNumber: number;
  weight?: number;
  reps?: number;
  duration?: number;
}

export interface WorkoutEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  sets: SetEntry[];
  timestamp: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  entries: WorkoutEntry[];
}

export interface RoutineExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
}

export interface Routine {
  id: string;
  name: string;
  type: RoutineType;
  exercises: RoutineExercise[];
}

export interface UserProfile {
  name: string;
  onboardingComplete: boolean;
  selectedRoutineType: RoutineType | null;
  weightUnit: "kg" | "lbs";
}
