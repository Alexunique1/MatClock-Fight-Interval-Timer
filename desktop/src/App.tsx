import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import {
  buildSegments,
  clamp,
  formatTime,
  getTimerSnapshot,
  getTotalDuration,
} from "./lib/timer";
import {
  ACTIVE_PROFILE_KEY,
  createProfile,
  defaultProfiles,
  loadProfiles,
  saveProfiles,
} from "./lib/profiles";
import {
  builtInSounds,
  getBuiltInSound,
  getSoundFile,
  soundEventLabels,
} from "./lib/sounds";
import { Profile, RunState, SoundEvent, TimerPhase } from "./types";

type View =
  | "timer"
  | "settings"
  | "profiles"
  | "flexibleRounds"
  | "soundPicker"
  | "languages"
  | "voice"
  | "timerScreen";

const LANGUAGE_STORAGE_KEY = "matclock-desktop-language";
const CUSTOM_SOUNDS_STORAGE_KEY = "matclock-desktop-custom-sounds";
const APP_VERSION = "0.1.5";

type LanguageOption = {
  id: string;
  label: string;
  speechLang: string;
};

type CustomSound = {
  id: string;
  label: string;
  path: string;
};

type DesktopSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: (() => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
};

const phaseLabels: Record<TimerPhase | "paused", string> = {
  idle: "Ready",
  prepare: "Prepare",
  round: "Round",
  warning: "Warning",
  rest: "Rest",
  finished: "Finished",
  paused: "Paused",
};

const languages: LanguageOption[] = [
  { id: "en", label: "English", speechLang: "en-US" },
  { id: "es", label: "Espanol", speechLang: "es-ES" },
  { id: "de", label: "Deutsch", speechLang: "de-DE" },
  { id: "pl", label: "Polish", speechLang: "pl-PL" },
  { id: "ru", label: "Russkii", speechLang: "ru-RU" },
  { id: "fr", label: "Francais", speechLang: "fr-FR" },
  { id: "zh-Hant", label: "Chinese Traditional", speechLang: "zh-TW" },
  { id: "zh-Hans", label: "Chinese Simplified", speechLang: "zh-CN" },
  { id: "th", label: "Thai", speechLang: "th-TH" },
  { id: "ar", label: "Arabic", speechLang: "ar-SA" },
  { id: "hi", label: "Hindi", speechLang: "hi-IN" },
  { id: "pt", label: "Portuguese", speechLang: "pt-PT" },
  { id: "uk", label: "Ukrainian", speechLang: "uk-UA" },
  { id: "be", label: "Belarusian", speechLang: "be-BY" },
  { id: "bs", label: "Bosanski", speechLang: "bs-BA" },
  { id: "it", label: "Italiano", speechLang: "it-IT" },
  { id: "fi", label: "Suomi", speechLang: "fi-FI" },
  { id: "vi", label: "Tieng Viet", speechLang: "vi-VN" },
];

const timerFonts = ["JetBrains Mono", "Consolas", "Agency FB", "Arial Black"];
const cardFonts = ["Inter", "Segoe UI", "Arial", "Agency FB"];
const startButtonTexts = ["Fight!", "Start", "Begin", "Go"];

function normalizeFlexibleRounds(profile: Profile, rounds = profile.timer.rounds): Profile {
  const flexibleRounds = Array.from({ length: rounds }, (_, index) => {
    return (
      profile.flexibleRounds[index] ?? {
        roundSeconds: profile.timer.roundSeconds,
        restSeconds: profile.timer.restSeconds,
      }
    );
  });

  return {
    ...profile,
    timer: { ...profile.timer, rounds },
    flexibleRounds,
  };
}

function secondsToParts(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return {
    minutes: Math.floor(safe / 60),
    seconds: safe % 60,
  };
}

function partsToSeconds(minutes: number, seconds: number) {
  return Math.max(0, Math.round(minutes) * 60 + Math.round(seconds));
}

function normalizeLanguage(value: string | null) {
  if (!value) {
    return "en";
  }

  return (
    languages.find((language) => language.id === value || language.label === value)?.id ??
    "en"
  );
}

function getLanguage(languageId: string) {
  return languages.find((language) => language.id === languageId) ?? languages[0];
}

function readCustomSounds() {
  try {
    const saved = localStorage.getItem(CUSTOM_SOUNDS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CustomSound[]) : [];
  } catch {
    return [];
  }
}

export function App() {
  const [view, setView] = useState<View>("timer");
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles);
  const [activeProfileId, setActiveProfileId] = useState(defaultProfiles[1].id);
  const [selectedSoundEvent, setSelectedSoundEvent] = useState<SoundEvent>("roundStart");
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [language, setLanguage] = useState("en");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const [voiceHint, setVoiceHint] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playedSegments = useRef<Set<string>>(new Set());
  const warnedRounds = useRef<Set<number>>(new Set());
  const restWarnedRounds = useRef<Set<number>>(new Set());
  const intervalSignals = useRef<Set<string>>(new Set());
  const announcedRounds = useRef<Set<number>>(new Set());
  const spokenCountdowns = useRef<Set<string>>(new Set());
  const finishPlayed = useRef(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const loadedProfiles = loadProfiles();
    const savedActiveProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    setProfiles(loadedProfiles);
    setCustomSounds(readCustomSounds());
    setActiveProfileId(savedActiveProfile ?? loadedProfiles[0]?.id ?? defaultProfiles[0].id);
    setLanguage(normalizeLanguage(savedLanguage));
  }, []);

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_SOUNDS_STORAGE_KEY, JSON.stringify(customSounds));
  }, [customSounds]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return undefined;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? defaultProfiles[0],
    [activeProfileId, profiles],
  );
  const activeLanguage = useMemo(() => getLanguage(language), [language]);

  const totalDuration = useMemo(() => getTotalDuration(activeProfile), [activeProfile]);
  const snapshot = useMemo(() => getTimerSnapshot(activeProfile, elapsed), [activeProfile, elapsed]);
  const currentSegment = useMemo(
    () =>
      buildSegments(activeProfile).find(
        (segment) => elapsed >= segment.startsAt && elapsed < segment.endsAt,
      ),
    [activeProfile, elapsed],
  );

  const displayedPhase: TimerPhase | "paused" = runState === "paused" ? "paused" : snapshot.phase;
  const ringProgress = Math.max(0.001, snapshot.segmentProgress);
  const totalLeft = Math.max(0, totalDuration - elapsed);
  const timerStyle = {
    "--phase": getPhaseColor(activeProfile, displayedPhase),
    "--timer-number": getNumberColor(activeProfile, displayedPhase),
    "--start-color": activeProfile.theme.startButtonColor,
    "--timer-font": activeProfile.theme.timerFont,
    "--card-font": activeProfile.theme.cardFont,
    "--top-row-height": `${activeProfile.theme.topRowHeight}px`,
    "--total-time-height": `${activeProfile.theme.totalTimeHeight}px`,
    "--button-height": `${activeProfile.theme.buttonHeight}px`,
  } as CSSProperties;

  const resetSoundMarkers = useCallback(() => {
    playedSegments.current = new Set();
    warnedRounds.current = new Set();
    restWarnedRounds.current = new Set();
    intervalSignals.current = new Set();
    announcedRounds.current = new Set();
    spokenCountdowns.current = new Set();
    finishPlayed.current = false;
  }, []);

  const getSoundFileForId = useCallback(
    (soundId: string) => {
      const customSound = customSounds.find((sound) => sound.id === soundId);
      return customSound ? convertFileSrc(customSound.path) : getSoundFile(soundId);
    },
    [customSounds],
  );

  const getSoundLabel = useCallback(
    (soundId: string) => {
      return customSounds.find((sound) => sound.id === soundId)?.label ?? getBuiltInSound(soundId).label;
    },
    [customSounds],
  );

  const playSound = useCallback((soundId: string) => {
    const file = getSoundFileForId(soundId);
    if (!file) {
      return;
    }

    const cached = audioCache.current.get(file);
    const audio = cached ?? new Audio(file);
    if (!cached) {
      audioCache.current.set(file, audio);
    }

    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }, [getSoundFileForId]);

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window) || !text) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = activeLanguage.speechLang;
      utterance.rate = 1;
      utterance.volume = 1;

      const selectedVoice = voices.find((voice) => voice.name === activeProfile.voice.voiceName);
      const languageVoice =
        selectedVoice ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith(activeLanguage.speechLang.toLowerCase())) ??
        voices.find((voice) =>
          voice.lang.toLowerCase().startsWith(activeLanguage.speechLang.slice(0, 2).toLowerCase()),
        );

      if (languageVoice) {
        utterance.voice = languageVoice;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [activeLanguage.speechLang, activeProfile.voice.voiceName, voices],
  );

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && activeProfile.display.preventSleep) {
        wakeLock.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      wakeLock.current = null;
    }
  }, [activeProfile.display.preventSleep]);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLock.current?.release();
    } catch {
      // Wake lock can already be released by the OS.
    } finally {
      wakeLock.current = null;
    }
  }, []);

  const updateActiveProfile = useCallback(
    (updater: (profile: Profile) => Profile) => {
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === activeProfile.id ? normalizeFlexibleRounds(updater(profile)) : profile,
        ),
      );
    },
    [activeProfile.id],
  );

  const updateTimer = useCallback(
    (patch: Partial<Profile["timer"]>) => {
      updateActiveProfile((profile) => {
        const nextTimer = { ...profile.timer, ...patch };
        const rounds = clamp(Math.round(nextTimer.rounds), 1, 99);
        return normalizeFlexibleRounds(
          {
            ...profile,
            timer: {
              ...nextTimer,
              prepareSeconds: clamp(nextTimer.prepareSeconds, 0, 3600),
              rounds,
              roundSeconds: clamp(nextTimer.roundSeconds, 1, 7200),
              restSeconds: clamp(nextTimer.restSeconds, 0, 3600),
              warningSeconds: clamp(nextTimer.warningSeconds, 0, nextTimer.roundSeconds),
              intervalSignalSeconds: clamp(nextTimer.intervalSignalSeconds, 0, nextTimer.roundSeconds),
              restEndWarningSeconds: clamp(nextTimer.restEndWarningSeconds, 0, nextTimer.restSeconds),
            },
          },
          rounds,
        );
      });
    },
    [updateActiveProfile],
  );

  const updateFlexibleRound = useCallback(
    (index: number, patch: Partial<Profile["flexibleRounds"][number]>) => {
      updateActiveProfile((profile) => {
        const flexibleRounds = [...profile.flexibleRounds];
        flexibleRounds[index] = {
          ...flexibleRounds[index],
          ...patch,
        };
        return { ...profile, flexibleRounds };
      });
    },
    [updateActiveProfile],
  );

  const updateSound = useCallback(
    (event: SoundEvent, soundId: string) => {
      updateActiveProfile((profile) => ({
        ...profile,
        sounds: {
          ...profile.sounds,
          [event]: soundId,
        },
      }));
    },
    [updateActiveProfile],
  );

  const handleAddCustomSound = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Audio",
          extensions: ["mp3", "wav", "ogg", "m4a"],
        },
      ],
    });

    if (typeof selected !== "string") {
      return;
    }

    const pathParts = selected.split(/[\\/]/);
    const fileName = pathParts[pathParts.length - 1] || "Custom sound";
    const customSound: CustomSound = {
      id: `custom:${Date.now()}`,
      label: fileName.replace(/\.[^.]+$/, ""),
      path: selected,
    };

    setCustomSounds((current) => [...current, customSound]);
    updateSound(selectedSoundEvent, customSound.id);
    const audio = new Audio(convertFileSrc(selected));
    audio.play().catch(() => undefined);
  }, [selectedSoundEvent, updateSound]);

  const updateDisplay = useCallback(
    (patch: Partial<Profile["display"]>) => {
      updateActiveProfile((profile) => ({
        ...profile,
        display: { ...profile.display, ...patch },
      }));
    },
    [updateActiveProfile],
  );

  const updateTheme = useCallback(
    (patch: Partial<Profile["theme"]>) => {
      updateActiveProfile((profile) => ({
        ...profile,
        theme: { ...profile.theme, ...patch },
      }));
    },
    [updateActiveProfile],
  );

  const updateVoice = useCallback(
    (patch: Partial<Profile["voice"]>) => {
      updateActiveProfile((profile) => ({
        ...profile,
        voice: { ...profile.voice, ...patch },
      }));
    },
    [updateActiveProfile],
  );

  useEffect(() => {
    if (runState !== "running" || startedAt === null) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      const nextElapsed = Math.min((Date.now() - startedAt) / 1000, totalDuration);
      setElapsed(nextElapsed);

      if (nextElapsed >= totalDuration) {
        setRunState("finished");
        setStartedAt(null);
      }
    }, 120);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [runState, startedAt, totalDuration]);

  useEffect(() => {
    if (runState === "running" && activeProfile.display.preventSleep) {
      void requestWakeLock();
      return () => {
        void releaseWakeLock();
      };
    }

    void releaseWakeLock();
    return undefined;
  }, [activeProfile.display.preventSleep, releaseWakeLock, requestWakeLock, runState]);

  useEffect(() => {
    if (runState !== "running" || !currentSegment) {
      return;
    }

    const segmentKey = `${currentSegment.phase}:${currentSegment.round}:${currentSegment.startsAt}`;
    if (!playedSegments.current.has(segmentKey)) {
      playedSegments.current.add(segmentKey);
      if (currentSegment.phase === "round") {
        playSound(activeProfile.sounds.roundStart);
        if (activeProfile.voice.announceRound && !announcedRounds.current.has(currentSegment.round)) {
          announcedRounds.current.add(currentSegment.round);
          speak(`Round ${currentSegment.round}`);
        }
      }
      if (currentSegment.phase === "rest") {
        playSound(activeProfile.sounds.restStart);
      }
    }

    const remaining = Math.ceil(currentSegment.endsAt - elapsed);
    if (
      currentSegment.phase === "round" &&
      activeProfile.timer.warningSeconds > 0 &&
      remaining <= activeProfile.timer.warningSeconds &&
      !warnedRounds.current.has(currentSegment.round)
    ) {
      warnedRounds.current.add(currentSegment.round);
      playSound(activeProfile.sounds.roundWarning);
    }

    if (
      currentSegment.phase === "round" &&
      activeProfile.voice.roundCountdownSeconds > 0 &&
      remaining <= activeProfile.voice.roundCountdownSeconds &&
      remaining > 0
    ) {
      const countdownKey = `round:${currentSegment.round}:${remaining}`;
      if (!spokenCountdowns.current.has(countdownKey)) {
        spokenCountdowns.current.add(countdownKey);
        speak(String(remaining));
      }
    }

    if (
      currentSegment.phase === "rest" &&
      activeProfile.timer.restEndWarningSeconds > 0 &&
      remaining <= activeProfile.timer.restEndWarningSeconds &&
      !restWarnedRounds.current.has(currentSegment.round)
    ) {
      restWarnedRounds.current.add(currentSegment.round);
      playSound(activeProfile.sounds.restWarning);
    }

    if (
      currentSegment.phase === "rest" &&
      activeProfile.voice.restCountdownSeconds > 0 &&
      remaining <= activeProfile.voice.restCountdownSeconds &&
      remaining > 0
    ) {
      const countdownKey = `rest:${currentSegment.round}:${remaining}`;
      if (!spokenCountdowns.current.has(countdownKey)) {
        spokenCountdowns.current.add(countdownKey);
        speak(String(remaining));
      }
    }

    if (currentSegment.phase === "round" && activeProfile.timer.intervalSignalSeconds > 0) {
      const elapsedInSegment = Math.floor(elapsed - currentSegment.startsAt);
      const intervalSlot = Math.floor(elapsedInSegment / activeProfile.timer.intervalSignalSeconds);
      const isExactSignalWindow =
        elapsedInSegment > 0 && elapsedInSegment % activeProfile.timer.intervalSignalSeconds === 0;
      const intervalKey = `${currentSegment.round}:${intervalSlot}`;

      if (isExactSignalWindow && !intervalSignals.current.has(intervalKey)) {
        intervalSignals.current.add(intervalKey);
        playSound(activeProfile.sounds.intervalSignal);
      }
    }
  }, [activeProfile, currentSegment, elapsed, playSound, runState, speak]);

  useEffect(() => {
    if (runState === "finished" && !finishPlayed.current) {
      finishPlayed.current = true;
      playSound(activeProfile.sounds.finish);
    }
  }, [activeProfile.sounds.finish, playSound, runState]);

  const handleStart = useCallback(() => {
    resetSoundMarkers();
    setElapsed(0);
    setPausedElapsed(0);
    setStartedAt(Date.now());
    setRunState("running");
  }, [resetSoundMarkers]);

  const handlePause = useCallback(() => {
    setPausedElapsed(elapsed);
    setStartedAt(null);
    setRunState("paused");
  }, [elapsed]);

  const handleResume = useCallback(() => {
    setStartedAt(Date.now() - pausedElapsed * 1000);
    setRunState("running");
  }, [pausedElapsed]);

  const handleReset = useCallback(() => {
    resetSoundMarkers();
    setElapsed(0);
    setPausedElapsed(0);
    setStartedAt(null);
    setRunState("idle");
  }, [resetSoundMarkers]);

  const handleFullscreen = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
      return;
    } catch {
      // Browser preview fallback.
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const handleAlwaysOnTop = useCallback(
    (enabled: boolean) => {
      updateDisplay({ alwaysOnTop: enabled });
      getCurrentWindow().setAlwaysOnTop(enabled).catch(() => undefined);
    },
    [updateDisplay],
  );

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      setActiveProfileId(profileId);
      resetSoundMarkers();
      setElapsed(0);
      setPausedElapsed(0);
      setStartedAt(null);
      setRunState("idle");
    },
    [resetSoundMarkers],
  );

  const handleCreateProfile = useCallback(() => {
    const nextIndex = profiles.length + 1;
    const profile = createProfile(
      `custom-${Date.now()}`,
      `custom profile ${nextIndex}`,
      activeProfile.timer.roundSeconds,
      activeProfile.timer.restSeconds,
      activeProfile.timer.rounds,
    );
    const nextProfile = {
      ...profile,
      timer: { ...activeProfile.timer },
      flexibleRoundsEnabled: activeProfile.flexibleRoundsEnabled,
      flexibleRounds: [...activeProfile.flexibleRounds],
      sounds: { ...activeProfile.sounds },
      voice: { ...activeProfile.voice },
      display: { ...activeProfile.display },
      theme: { ...activeProfile.theme },
    };
    setProfiles((current) => [...current, nextProfile]);
    setActiveProfileId(nextProfile.id);
  }, [activeProfile, profiles.length]);

  const handleRenameProfile = useCallback((profileId: string, name: string) => {
    const nextName = name.trim();
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId ? { ...profile, name: nextName || profile.name } : profile,
      ),
    );
  }, []);

  const handleDuplicateProfile = useCallback((profile: Profile) => {
    const duplicate = {
      ...profile,
      id: `custom-${Date.now()}`,
      name: `${profile.name} copy`,
      flexibleRounds: [...profile.flexibleRounds],
      sounds: { ...profile.sounds },
      voice: { ...profile.voice },
      display: { ...profile.display },
      theme: { ...profile.theme },
      timer: { ...profile.timer },
    };

    setProfiles((current) => [...current, duplicate]);
    setActiveProfileId(duplicate.id);
  }, []);

  const handleDeleteProfile = useCallback(
    (profileId: string) => {
      if (profiles.length <= 1) {
        return;
      }

      setProfiles((current) => {
        const nextProfiles = current.filter((profile) => profile.id !== profileId);
        if (profileId === activeProfileId) {
          setActiveProfileId(nextProfiles[0]?.id ?? defaultProfiles[0].id);
        }
        return nextProfiles;
      });
    },
    [activeProfileId, profiles.length],
  );

  const handleOpenExternal = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "SELECT") {
        return;
      }

      if (event.code === "Space" && view === "timer") {
        event.preventDefault();
        if (runState === "running") {
          handlePause();
        } else if (runState === "paused") {
          handleResume();
        } else {
          handleStart();
        }
      }

      if (event.code === "KeyR" && view === "timer") {
        handleReset();
      }

      if (event.code === "KeyF" && view === "timer") {
        void handleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFullscreen, handlePause, handleReset, handleResume, handleStart, runState, view]);

  useEffect(() => {
    if (!activeProfile.voice.voiceControl) {
      return undefined;
    }

    const SpeechRecognition =
      (window as typeof window & {
        SpeechRecognition?: new () => DesktopSpeechRecognition;
        webkitSpeechRecognition?: new () => DesktopSpeechRecognition;
      }).SpeechRecognition ??
      (window as typeof window & {
        webkitSpeechRecognition?: new () => DesktopSpeechRecognition;
      }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceHint("Voice control is not available");
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = activeLanguage.speechLang;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .toLowerCase();

      if (!transcript) {
        return;
      }

      setVoiceHint(transcript);

      if (/\b(start|fight|go|resume|begin)\b/.test(transcript)) {
        if (runState === "paused") {
          handleResume();
        } else if (runState !== "running") {
          handleStart();
        }
      }

      if (/\b(pause|stop)\b/.test(transcript) && runState === "running") {
        handlePause();
      }

      if (/\b(reset|restart)\b/.test(transcript)) {
        handleReset();
      }
    };

    recognition.onerror = () => setVoiceHint("Voice command error");
    recognition.start();

    return () => recognition.stop();
  }, [
    activeLanguage.speechLang,
    activeProfile.voice.voiceControl,
    handlePause,
    handleReset,
    handleResume,
    handleStart,
    runState,
  ]);

  if (view === "settings") {
    return (
      <SettingsLayout title="Settings" onBack={() => setView("timer")}>
        <Section title="Profile">
          <SettingsRow
            detail={activeProfile.name}
            label="Profile"
            onClick={() => setView("profiles")}
          />
          <NumberRow
            label="Rounds"
            max={99}
            min={1}
            value={activeProfile.timer.rounds}
            onChange={(rounds) => updateTimer({ rounds })}
          />
          <TimeRow
            label="Round time"
            seconds={activeProfile.timer.roundSeconds}
            onChange={(roundSeconds) => updateTimer({ roundSeconds })}
          />
          <TimeRow
            label="Rest time"
            seconds={activeProfile.timer.restSeconds}
            onChange={(restSeconds) => updateTimer({ restSeconds })}
          />
          <TimeRow
            label="Prepare time"
            seconds={activeProfile.timer.prepareSeconds}
            onChange={(prepareSeconds) => updateTimer({ prepareSeconds })}
          />
          <TimeRow
            detail="Signal before the round ends"
            label="Round end warning"
            seconds={activeProfile.timer.warningSeconds}
            onChange={(warningSeconds) => updateTimer({ warningSeconds })}
          />
          <TimeRow
            detail="Repeating signal during a round. Set 00:00 to disable."
            label="Signal inside round"
            seconds={activeProfile.timer.intervalSignalSeconds}
            onChange={(intervalSignalSeconds) => updateTimer({ intervalSignalSeconds })}
          />
          <ToggleRow
            checked={activeProfile.timer.restEndWarningSeconds > 0}
            detail="Sounds 10 seconds before rest ends"
            label="Rest end warning"
            onChange={(enabled) => updateTimer({ restEndWarningSeconds: enabled ? 10 : 0 })}
          />
          <SettingsRow
            detail={activeProfile.flexibleRoundsEnabled ? "Enabled" : "Disabled"}
            label="Flexible rounds"
            onClick={() => setView("flexibleRounds")}
          />
        </Section>

        <Section title="Sound selection">
          {(Object.keys(activeProfile.sounds) as SoundEvent[]).map((event) => (
            <SettingsRow
              detail={getSoundLabel(activeProfile.sounds[event])}
              key={event}
              label={soundEventLabels[event]}
              onClick={() => {
                setSelectedSoundEvent(event);
                setView("soundPicker");
              }}
            />
          ))}
        </Section>

        <Section title="Language and voice">
          <SettingsRow detail={activeLanguage.label} label="Languages" onClick={() => setView("languages")} />
          <SettingsRow
            detail={activeProfile.voice.voiceName || "Auto"}
            label="Voice"
            onClick={() => setView("voice")}
          />
          <ToggleRow
            checked={activeProfile.voice.announceRound}
            detail="Voice announces the round number at the start"
            label="Announce round number"
            onChange={(announceRound) => updateVoice({ announceRound })}
          />
          <NumberRow
            detail="Voice countdown before round ends"
            label="Round countdown"
            max={60}
            min={0}
            value={activeProfile.voice.roundCountdownSeconds}
            onChange={(roundCountdownSeconds) => updateVoice({ roundCountdownSeconds })}
          />
          <NumberRow
            detail="Voice countdown before rest ends"
            label="Rest countdown"
            max={60}
            min={0}
            value={activeProfile.voice.restCountdownSeconds}
            onChange={(restCountdownSeconds) => updateVoice({ restCountdownSeconds })}
          />
          <SettingsRow
            detail={activeProfile.voice.voiceControl ? "On" : "Off"}
            label="Voice control"
            onClick={() => updateVoice({ voiceControl: !activeProfile.voice.voiceControl })}
          />
        </Section>

        <Section title="Display and behavior">
          <SettingsRow
            detail="Timer appearance, colors, fonts and layout"
            label="Timer screen"
            onClick={() => setView("timerScreen")}
          />
          <SelectRow
            label="Theme"
            options={["dark", "light", "system"]}
            value={activeProfile.theme.mode}
            onChange={(mode) => updateTheme({ mode: mode as Profile["theme"]["mode"] })}
          />
          <ToggleRow
            checked={activeProfile.display.preventSleep}
            detail="Keep the screen awake while training"
            label="Prevent sleep"
            onChange={(preventSleep) => updateDisplay({ preventSleep })}
          />
        </Section>

        <Section title="About">
          <IconRow
            label="Website"
            value="matclock.online"
            onClick={() => handleOpenExternal("https://matclock.online")}
          />
          <IconRow label="Rate" value="Coming soon" />
          <IconRow
            label="Share"
            value="matclock.online"
            onClick={() => handleOpenExternal("https://matclock.online")}
          />
          <IconRow
            label="Contact developers"
            value="support@matclock.online"
            onClick={() => handleOpenExternal("mailto:support@matclock.online")}
          />
          <IconRow
            label="Privacy Policy"
            value="Local profiles only"
            onClick={() => handleOpenExternal("https://matclock.online/privacy")}
          />
          <IconRow label="Version" value={APP_VERSION} />
        </Section>
      </SettingsLayout>
    );
  }

  if (view === "profiles") {
    return (
      <SettingsLayout
        action={<button className="accent-small" type="button" onClick={handleCreateProfile}>+ Create new</button>}
        title="Profiles"
        onBack={() => setView("settings")}
      >
        <div className="mat-list">
          {profiles.map((profile) => (
            <div
              className="profile-select-row"
              key={profile.id}
            >
              <span>
                <input
                  aria-label="Profile name"
                  type="text"
                  value={profile.name}
                  onChange={(event) => handleRenameProfile(profile.id, event.target.value)}
                />
                <small>
                Round: {formatTime(profile.timer.roundSeconds)} / Rest:{" "}
                  {formatTime(profile.timer.restSeconds)}
                </small>
              </span>
              <div className="profile-actions">
                {profile.id === activeProfile.id ? (
                  <b>Selected</b>
                ) : (
                  <button type="button" onClick={() => handleSelectProfile(profile.id)}>
                    Select
                  </button>
                )}
                <button type="button" onClick={() => handleDuplicateProfile(profile)}>
                  Duplicate
                </button>
                <button
                  disabled={profiles.length <= 1}
                  type="button"
                  onClick={() => handleDeleteProfile(profile.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (view === "flexibleRounds") {
    return (
      <SettingsLayout title="Round settings" onBack={() => setView("settings")}>
        <Section title="Mode">
          <ToggleRow
            checked={activeProfile.flexibleRoundsEnabled}
            detail="Set unique round and rest duration for each round"
            label="Flexible time"
            onChange={(flexibleRoundsEnabled) => updateActiveProfile((profile) => ({
              ...profile,
              flexibleRoundsEnabled,
            }))}
          />
        </Section>
        {activeProfile.flexibleRounds.map((round, index) => (
          <Section key={index} title={`Round ${index + 1}`}>
            <TimeRow
              marker="green"
              label="Fight"
              seconds={round.roundSeconds}
              onChange={(roundSeconds) => updateFlexibleRound(index, { roundSeconds })}
            />
            {index < activeProfile.timer.rounds - 1 && (
              <TimeRow
                marker="red"
                label="Rest"
                seconds={round.restSeconds}
                onChange={(restSeconds) => updateFlexibleRound(index, { restSeconds })}
              />
            )}
          </Section>
        ))}
      </SettingsLayout>
    );
  }

  if (view === "soundPicker") {
    const soundOptions = [...builtInSounds, ...customSounds.map((sound) => ({
      id: sound.id,
      label: sound.label,
      file: sound.path,
    }))];

    return (
      <SettingsLayout
        action={<button className="accent-small" type="button" onClick={handleAddCustomSound}>+ Add</button>}
        title={soundEventLabels[selectedSoundEvent]}
        onBack={() => setView("settings")}
      >
        <h2 className="settings-subtitle">Built-in sounds</h2>
        <div className="mat-list">
          {soundOptions.map((sound) => (
            <button
              className="choice-row"
              key={sound.id}
              type="button"
              onClick={() => {
                updateSound(selectedSoundEvent, sound.id);
                playSound(sound.id);
              }}
            >
              <span>{sound.label}</span>
              {activeProfile.sounds[selectedSoundEvent] === sound.id && <b>Selected</b>}
            </button>
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (view === "languages") {
    return (
      <SettingsLayout title="Languages" onBack={() => setView("settings")}>
        <div className="mat-list">
          {languages.map((item) => (
            <label className="radio-row" key={item.id}>
              <input
                checked={item.id === language}
                name="language"
                type="radio"
                onChange={() => setLanguage(item.id)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (view === "voice") {
    const matchingVoices = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(activeLanguage.speechLang.slice(0, 2).toLowerCase()),
    );
    const voiceOptions = matchingVoices.length > 0 ? matchingVoices : voices;

    return (
      <SettingsLayout title="Voice" onBack={() => setView("settings")}>
        <div className="voice-placeholder">
          <p>
            To add voices in more languages, install speech language packs in Windows settings.
          </p>
          <button
            className="secondary-action"
            type="button"
            onClick={() => handleOpenExternal("ms-settings:speech")}
          >
            Open speech settings
          </button>
        </div>
        <Section title="System voices">
          <SelectRow
            label="Voice"
            options={["Auto", ...voiceOptions.map((voice) => voice.name)]}
            value={activeProfile.voice.voiceName || "Auto"}
            onChange={(voiceName) => updateVoice({ voiceName: voiceName === "Auto" ? "" : voiceName })}
          />
          <button className="wide-reset" type="button" onClick={() => speak("Round one")}>
            Test voice
          </button>
        </Section>
      </SettingsLayout>
    );
  }

  if (view === "timerScreen") {
    return (
      <SettingsLayout title="Timer screen" onBack={() => setView("settings")}>
        <Section title="Display">
          <ToggleRow
            checked={activeProfile.display.showTotalTime}
            detail="Show remaining total workout time"
            label="Show total time"
            onChange={(showTotalTime) => updateDisplay({ showTotalTime })}
          />
          <ToggleRow
            checked={activeProfile.display.countUpTotalTime}
            detail="Count elapsed total time instead of remaining"
            label="Count up total time"
            onChange={(countUpTotalTime) => updateDisplay({ countUpTotalTime })}
          />
          <ToggleRow
            checked={activeProfile.display.countUpPhaseTime}
            detail="Count elapsed phase time instead of remaining"
            label="Count up timer"
            onChange={(countUpPhaseTime) => updateDisplay({ countUpPhaseTime })}
          />
          <ToggleRow
            checked={activeProfile.display.showRoundNumber}
            detail="Show current round indicator"
            label="Show round number"
            onChange={(showRoundNumber) => updateDisplay({ showRoundNumber })}
          />
          <ToggleRow
            checked={activeProfile.display.showVoiceHints}
            detail="Show recognized commands on the timer screen"
            label="Show voice hints"
            onChange={(showVoiceHints) => updateDisplay({ showVoiceHints })}
          />
          <ToggleRow
            checked={activeProfile.display.alwaysOnTop}
            detail="Keep MatClock above other windows"
            label="Always on top"
            onChange={handleAlwaysOnTop}
          />
        </Section>

        <Section title="Start button">
          <SelectRow
            label="Button text"
            options={startButtonTexts}
            value={activeProfile.theme.startButtonText}
            onChange={(startButtonText) => updateTheme({ startButtonText })}
          />
          <ColorRow
            label="Button color"
            value={activeProfile.theme.startButtonColor}
            onChange={(startButtonColor) => updateTheme({ startButtonColor })}
          />
        </Section>

        <Section title="Colors">
          <ColorRow
            label="Round"
            value={activeProfile.theme.roundColor}
            onChange={(roundColor) => updateTheme({ roundColor })}
          />
          <ColorRow
            label="Rest"
            value={activeProfile.theme.restColor}
            onChange={(restColor) => updateTheme({ restColor })}
          />
          <ColorRow
            label="Warning"
            value={activeProfile.theme.warningColor}
            onChange={(warningColor) => updateTheme({ warningColor })}
          />
          <button className="wide-reset" type="button" onClick={() => updateTheme({
            roundColor: "#00e676",
            restColor: "#dc2626",
            warningColor: "#90cdff",
          })}>
            Reset colors
          </button>
        </Section>

        <Section title="Fonts">
          <SelectRow
            label="Timer font"
            options={timerFonts}
            value={activeProfile.theme.timerFont}
            onChange={(timerFont) => updateTheme({ timerFont })}
          />
          <SelectRow
            label="Card font"
            options={cardFonts}
            value={activeProfile.theme.cardFont}
            onChange={(cardFont) => updateTheme({ cardFont })}
          />
        </Section>

        <Section title="Layout">
          <NumberRow
            label="Top row height"
            max={120}
            min={40}
            value={activeProfile.theme.topRowHeight}
            onChange={(topRowHeight) => updateTheme({ topRowHeight })}
          />
          <NumberRow
            label="Total time height"
            max={220}
            min={80}
            value={activeProfile.theme.totalTimeHeight}
            onChange={(totalTimeHeight) => updateTheme({ totalTimeHeight })}
          />
          <NumberRow
            label="Button height"
            max={80}
            min={40}
            value={activeProfile.theme.buttonHeight}
            onChange={(buttonHeight) => updateTheme({ buttonHeight })}
          />
          <button className="wide-reset" type="button" onClick={() => updateTheme({
            topRowHeight: 60,
            totalTimeHeight: 120,
            buttonHeight: 52,
          })}>
            Reset settings
          </button>
        </Section>
      </SettingsLayout>
    );
  }

  return (
    <main
      className={`app-frame matclock-desktop theme-${resolveTheme(activeProfile.theme.mode)}`}
      style={timerStyle}
    >
      <header className="window-titlebar">
        <strong>MatClock</strong>
        <nav>
          <button type="button" onClick={() => setView("settings")}>Settings</button>
        </nav>
      </header>

      <section className="timer-dashboard">
        <aside className="total-card">
          <span className="panel-label">Total time</span>
          <strong>
            {formatTime(
              activeProfile.display.countUpTotalTime
                ? elapsed
                : activeProfile.display.showTotalTime
                  ? totalLeft
                  : totalDuration,
            )}
          </strong>
        </aside>

        <section className="timer-center">
          <div className={`timer-circle phase-${displayedPhase}`}>
            <svg className="progress-ring" viewBox="0 0 100 100" aria-hidden>
              <circle className="ring-track" cx="50" cy="50" r="47" />
              <circle
                className="ring-progress"
                cx="50"
                cy="50"
                pathLength={1}
                r="47"
                style={{ strokeDashoffset: 1 - ringProgress }}
              />
            </svg>

            <div className="timer-core">
              <span className="round-label">
                {activeProfile.display.showRoundNumber
                  ? `${phaseLabels[displayedPhase]} / ${String(snapshot.round).padStart(2, "0")}/${String(
                      activeProfile.timer.rounds,
                    ).padStart(2, "0")}`
                  : phaseLabels[displayedPhase]}
              </span>
              <div className="timer-face" aria-live="polite">
                {formatTime(snapshot.remaining)}
              </div>
            </div>
          </div>

          {activeProfile.display.showVoiceHints && activeProfile.voice.voiceControl && voiceHint && (
            <p className="voice-hint">{voiceHint}</p>
          )}

          <div className="control-row">
            {(runState === "idle" || runState === "finished") && (
              <button className="primary-action" type="button" onClick={handleStart}>
                {activeProfile.theme.startButtonText} <KeyBadge>Space</KeyBadge>
              </button>
            )}
            {runState === "running" && (
              <button className="primary-action is-running" type="button" onClick={handlePause}>
                Pause <KeyBadge>Space</KeyBadge>
              </button>
            )}
            {runState === "paused" && (
              <button className="primary-action" type="button" onClick={handleResume}>
                Resume <KeyBadge>Space</KeyBadge>
              </button>
            )}
            <button className="secondary-action" type="button" onClick={handleReset}>
              Reset <KeyBadge>R</KeyBadge>
            </button>
            <button className="maximize-action" type="button" onClick={handleFullscreen}>
              Maximize <KeyBadge>F</KeyBadge>
            </button>
          </div>
        </section>

      </section>
    </main>
  );
}

function getPhaseColor(profile: Profile, phase: TimerPhase | "paused") {
  if (phase === "round" || phase === "warning") {
    return profile.theme.roundColor;
  }
  if (phase === "rest") {
    return profile.theme.restColor;
  }
  if (phase === "prepare" || phase === "paused") {
    return profile.theme.warningColor;
  }
  return "#ffffff";
}

function getNumberColor(profile: Profile, phase: TimerPhase | "paused") {
  if (phase === "round" || phase === "warning") {
    return profile.theme.roundColor;
  }
  if (phase === "rest") {
    return profile.theme.restColor;
  }
  return "#ffffff";
}

function resolveTheme(mode: Profile["theme"]["mode"]) {
  if (mode === "system") {
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  return mode;
}

function KeyBadge({ children }: { children: string }) {
  return <span className="key-badge">{children}</span>;
}

function SettingsLayout({
  action,
  children,
  title,
  onBack,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
  onBack: () => void;
}) {
  return (
    <main className="settings-screen">
      <header className="settings-header">
        <button className="back-button" type="button" onClick={onBack}>Back</button>
        <h1>{title}</h1>
        <div>{action}</div>
      </header>
      <div className="settings-content">{children}</div>
    </main>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

function SettingsRow({
  detail,
  label,
  onClick,
}: {
  detail?: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button className="settings-row" type="button" onClick={onClick}>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <b>&gt;</b>
    </button>
  );
}

function IconRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>
        <strong>{label}</strong>
      </span>
      <small>{value}</small>
    </>
  );

  if (onClick) {
    return (
      <button className="settings-row is-static" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className="settings-row is-static">
      {content}
    </div>
  );
}

function ToggleRow({
  checked,
  detail,
  label,
  onChange,
}: {
  checked: boolean;
  detail?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-row is-static">
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <input
        checked={checked}
        className="switch-input"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function NumberRow({
  detail,
  label,
  max,
  min,
  value,
  onChange,
}: {
  detail?: string;
  label: string;
  max: number;
  min: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="settings-row is-static">
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <input
        max={max}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
      />
    </label>
  );
}

function TimeRow({
  detail,
  label,
  marker,
  seconds,
  onChange,
}: {
  detail?: string;
  label: string;
  marker?: "green" | "red";
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const parts = secondsToParts(seconds);

  return (
    <div className={`settings-row is-static${marker ? ` marker-${marker}` : ""}`}>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <div className="time-inputs">
        <input
          min={0}
          type="number"
          value={parts.minutes}
          onChange={(event) => onChange(partsToSeconds(Number(event.target.value), parts.seconds))}
        />
        <b>:</b>
        <input
          max={59}
          min={0}
          type="number"
          value={parts.seconds}
          onChange={(event) => onChange(partsToSeconds(parts.minutes, Number(event.target.value)))}
        />
      </div>
    </div>
  );
}

function SelectRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-row is-static">
      <span>
        <strong>{label}</strong>
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-row is-static">
      <span>
        <strong>{label}</strong>
      </span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
