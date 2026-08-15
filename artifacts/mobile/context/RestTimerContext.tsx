import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

export const DEFAULT_REST_SECONDS = 90;
export const REST_PRESETS = [30, 60, 90, 120, 180];

const REST_SOUND_KEY = "@kinetic/rest-sound-enabled";
const FINISH_HOLD_MS = 3000;

const BEEP_SOURCE = require("@/assets/audio/rest-timer-beep.wav");

interface RestTimerContextValue {
  remaining: number;
  total: number;
  running: boolean;
  active: boolean;
  justFinished: boolean;
  soundEnabled: boolean;
  startRest: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  addTime: (seconds: number) => void;
  setPreset: (seconds: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function RestTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(DEFAULT_REST_SECONDS);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  const endTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const soundRef = useRef(soundEnabled);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(REST_SOUND_KEY)
      .then((stored) => {
        if (stored != null) {
          setSoundEnabledState(stored === "1");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    import("expo-audio")
      .then(({ setAudioModeAsync }) =>
        setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && running && endTimeRef.current != null) {
        const rem = Math.max(
          0,
          Math.ceil((endTimeRef.current - Date.now()) / 1000),
        );
        setRemaining(rem);
        if (rem <= 0 && !completedRef.current) {
          complete();
        }
      }
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const playBeep = useCallback(() => {
    void (async () => {
      try {
        const audio = await import("expo-audio");
        if (!playerRef.current) {
          playerRef.current = audio.createAudioPlayer(BEEP_SOURCE);
        }
        const player = playerRef.current;
        await player.seekTo(0);
        player.play();
      } catch (error) {
        console.warn("[RestTimer] Failed to play beep:", error);
      }
    })();
  }, []);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setRunning(false);
    setJustFinished(true);
    setRemaining(0);

    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }

    if (soundRef.current) {
      playBeep();
    }

    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    finishTimeoutRef.current = setTimeout(() => {
      setActive(false);
      setJustFinished(false);
    }, FINISH_HOLD_MS);
  }, [playBeep]);

  useEffect(() => {
    if (!running || !active) return;
    const id = setInterval(() => {
      const end = endTimeRef.current;
      if (end == null) return;
      const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0 && !completedRef.current) {
        complete();
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, active, complete]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, []);

  const startRest = useCallback(
    (seconds: number = DEFAULT_REST_SECONDS) => {
      const safe = Math.max(5, Math.round(seconds));
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
      endTimeRef.current = Date.now() + safe * 1000;
      completedRef.current = false;
      setTotal(safe);
      setRemaining(safe);
      setJustFinished(false);
      setActive(true);
      setRunning(true);
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => {},
        );
      }
    },
    [],
  );

  const pause = useCallback(() => {
    if (!running) return;
    const end = endTimeRef.current;
    if (end != null) {
      const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(rem);
    }
    setRunning(false);
  }, [running]);

  const resume = useCallback(() => {
    if (!active || running || remaining <= 0) return;
    endTimeRef.current = Date.now() + remaining * 1000;
    completedRef.current = false;
    setRunning(true);
  }, [active, remaining, running]);

  const skip = useCallback(() => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    setActive(false);
    setRunning(false);
    setJustFinished(false);
    setRemaining(0);
    endTimeRef.current = null;
    completedRef.current = true;
  }, []);

  const addTime = useCallback(
    (seconds: number) => {
      if (!active) return;
      setTotal((prev) => prev + seconds);
      if (running) {
        if (endTimeRef.current != null) {
          endTimeRef.current += seconds * 1000;
        }
        const rem = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
        setRemaining(rem);
        completedRef.current = false;
        if (justFinished) setJustFinished(false);
      } else {
        setRemaining((prev) => Math.max(0, prev + seconds));
      }
    },
    [active, justFinished, running],
  );

  const setPreset = useCallback(
    (seconds: number) => {
      startRest(seconds);
    },
    [startRest],
  );

  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    setSoundEnabledState(enabled);
    await AsyncStorage.setItem(REST_SOUND_KEY, enabled ? "1" : "0").catch(
      () => {},
    );
  }, []);

  const value = useMemo<RestTimerContextValue>(
    () => ({
      remaining,
      total,
      running,
      active,
      justFinished,
      soundEnabled,
      startRest,
      pause,
      resume,
      skip,
      addTime,
      setPreset,
      setSoundEnabled,
    }),
    [
      remaining,
      total,
      running,
      active,
      justFinished,
      soundEnabled,
      startRest,
      pause,
      resume,
      skip,
      addTime,
      setPreset,
      setSoundEnabled,
    ],
  );

  return (
    <RestTimerContext.Provider value={value}>
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimer(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be used within RestTimerProvider");
  return ctx;
}
