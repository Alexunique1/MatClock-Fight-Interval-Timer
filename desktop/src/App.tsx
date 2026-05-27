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
import { Profile, RunState, SoundEvent, TimerPhase, TimerSettings } from "./types";

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
const APP_VERSION = "0.1.12";

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

type UiCopy = {
  settings: string;
  back: string;
  totalTime: string;
  round: string;
  rounds: string;
  rest: string;
  profile: string;
  profiles: string;
  prepare: string;
  warning: string;
  ready: string;
  paused: string;
  finished: string;
  fight: string;
  pause: string;
  resume: string;
  reset: string;
  maximize: string;
  minimize: string;
  select: string;
  selected: string;
  edit: string;
  done: string;
  duplicate: string;
  delete: string;
  createNew: string;
  save: string;
  discard: string;
  saveProfileChanges: string;
  unsavedProfileChanges: string;
  roundTime: string;
  restTime: string;
  prepareTime: string;
  roundEndWarning: string;
  signalInsideRound: string;
  restEndWarning: string;
  flexibleRounds: string;
  enabled: string;
  disabled: string;
  interfaceLanguage: string;
  soundSettings: string;
  timerScreen: string;
  displayColorsFonts: string;
  sixEventsCustomFiles: string;
  languageVoice: string;
  voice: string;
  auto: string;
  announceRoundNumber: string;
  roundCountdown: string;
  restCountdown: string;
  voiceControl: string;
  on: string;
  off: string;
  displayBehavior: string;
  theme: string;
  preventSleep: string;
  about: string;
  website: string;
  rate: string;
  share: string;
  contactDevelopers: string;
  privacyPolicy: string;
  version: string;
  soundSelection: string;
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

const enCopy: UiCopy = {
  settings: "Settings",
  back: "Back",
  totalTime: "Total time",
  round: "Round",
  rounds: "Rounds",
  rest: "Rest",
  profile: "Profile",
  profiles: "Profiles",
  prepare: "Prepare",
  warning: "Warning",
  ready: "Ready",
  paused: "Paused",
  finished: "Finished",
  fight: "Fight!",
  pause: "Pause",
  resume: "Resume",
  reset: "Reset",
  maximize: "Maximize",
  minimize: "Minimize",
  select: "Select",
  selected: "Selected",
  edit: "Edit",
  done: "Done",
  duplicate: "Duplicate",
  delete: "Delete",
  createNew: "+ Create new",
  save: "Save",
  discard: "Discard",
  saveProfileChanges: "Save profile changes?",
  unsavedProfileChanges: "Time settings were changed for this profile.",
  roundTime: "Round time",
  restTime: "Rest time",
  prepareTime: "Prepare time",
  roundEndWarning: "Round end warning",
  signalInsideRound: "Signal inside round",
  restEndWarning: "Rest end warning",
  flexibleRounds: "Flexible rounds",
  enabled: "Enabled",
  disabled: "Disabled",
  interfaceLanguage: "Interface language",
  soundSettings: "Sound settings",
  timerScreen: "Timer screen",
  displayColorsFonts: "Display, colors, fonts",
  sixEventsCustomFiles: "6 events + custom files",
  languageVoice: "Language and voice",
  voice: "Voice",
  auto: "Auto",
  announceRoundNumber: "Announce round number",
  roundCountdown: "Round countdown",
  restCountdown: "Rest countdown",
  voiceControl: "Voice control",
  on: "On",
  off: "Off",
  displayBehavior: "Display and behavior",
  theme: "Theme",
  preventSleep: "Prevent sleep",
  about: "About",
  website: "Website",
  rate: "Rate",
  share: "Share",
  contactDevelopers: "Contact developers",
  privacyPolicy: "Privacy Policy",
  version: "Version",
  soundSelection: "Sound selection",
};

const ruCopy: UiCopy = {
  ...enCopy,
  settings: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
  back: "\u041d\u0430\u0437\u0430\u0434",
  totalTime: "\u041e\u0431\u0449\u0435\u0435 \u0432\u0440\u0435\u043c\u044f",
  round: "\u0420\u0430\u0443\u043d\u0434",
  rounds: "\u0420\u0430\u0443\u043d\u0434\u044b",
  rest: "\u041e\u0442\u0434\u044b\u0445",
  profile: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c",
  profiles: "\u041f\u0440\u043e\u0444\u0438\u043b\u0438",
  prepare: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
  warning: "\u041f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435",
  ready: "\u0413\u043e\u0442\u043e\u0432\u043e",
  paused: "\u041f\u0430\u0443\u0437\u0430",
  finished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e",
  fight: "\u0411\u043e\u0439!",
  pause: "\u041f\u0430\u0443\u0437\u0430",
  resume: "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c",
  reset: "\u0421\u0431\u0440\u043e\u0441",
  maximize: "\u041d\u0430 \u0432\u0435\u0441\u044c \u044d\u043a\u0440\u0430\u043d",
  minimize: "\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c",
  select: "\u0412\u044b\u0431\u0440\u0430\u0442\u044c",
  selected: "\u0412\u044b\u0431\u0440\u0430\u043d",
  edit: "\u041f\u0440\u0430\u0432\u0438\u0442\u044c",
  done: "\u0413\u043e\u0442\u043e\u0432\u043e",
  duplicate: "\u0414\u0443\u0431\u043b\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
  createNew: "+ \u0421\u043e\u0437\u0434\u0430\u0442\u044c",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  discard: "\u041e\u0442\u043c\u0435\u043d\u0430",
  saveProfileChanges: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u044f?",
  unsavedProfileChanges: "\u0412\u044b \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u0438 \u0432\u0440\u0435\u043c\u044f \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u043f\u0440\u043e\u0444\u0438\u043b\u044f.",
  roundTime: "\u0412\u0440\u0435\u043c\u044f \u0440\u0430\u0443\u043d\u0434\u0430",
  restTime: "\u0412\u0440\u0435\u043c\u044f \u043e\u0442\u0434\u044b\u0445\u0430",
  prepareTime: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
  roundEndWarning: "\u0421\u0438\u0433\u043d\u0430\u043b \u0434\u043e \u043a\u043e\u043d\u0446\u0430 \u0440\u0430\u0443\u043d\u0434\u0430",
  signalInsideRound: "\u0421\u0438\u0433\u043d\u0430\u043b \u0432\u043d\u0443\u0442\u0440\u0438 \u0440\u0430\u0443\u043d\u0434\u0430",
  restEndWarning: "\u0421\u0438\u0433\u043d\u0430\u043b \u0434\u043e \u043a\u043e\u043d\u0446\u0430 \u043e\u0442\u0434\u044b\u0445\u0430",
  flexibleRounds: "\u0413\u0438\u0431\u043a\u0438\u0435 \u0440\u0430\u0443\u043d\u0434\u044b",
  enabled: "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u043e",
  disabled: "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e",
  interfaceLanguage: "\u042f\u0437\u044b\u043a \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430",
  soundSettings: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0437\u0432\u0443\u043a\u0430",
  timerScreen: "\u042d\u043a\u0440\u0430\u043d \u0442\u0430\u0439\u043c\u0435\u0440\u0430",
  displayColorsFonts: "\u042d\u043a\u0440\u0430\u043d, \u0446\u0432\u0435\u0442\u0430, \u0448\u0440\u0438\u0444\u0442\u044b",
  sixEventsCustomFiles: "6 \u0441\u043e\u0431\u044b\u0442\u0438\u0439 + \u0441\u0432\u043e\u0438 \u0444\u0430\u0439\u043b\u044b",
  languageVoice: "\u042f\u0437\u044b\u043a \u0438 \u0433\u043e\u043b\u043e\u0441",
  voice: "\u0413\u043e\u043b\u043e\u0441",
  auto: "\u0410\u0432\u0442\u043e",
  announceRoundNumber: "\u041d\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0440\u0430\u0443\u043d\u0434\u0430",
  roundCountdown: "\u041e\u0442\u0441\u0447\u0435\u0442 \u0440\u0430\u0443\u043d\u0434\u0430",
  restCountdown: "\u041e\u0442\u0441\u0447\u0435\u0442 \u043e\u0442\u0434\u044b\u0445\u0430",
  voiceControl: "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
  on: "\u0412\u043a\u043b",
  off: "\u0412\u044b\u043a\u043b",
  displayBehavior: "\u042d\u043a\u0440\u0430\u043d \u0438 \u043f\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435",
  theme: "\u0422\u0435\u043c\u0430",
  preventSleep: "\u041d\u0435 \u0437\u0430\u0442\u0435\u043c\u043d\u044f\u0442\u044c \u044d\u043a\u0440\u0430\u043d",
  about: "\u041e \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0438",
  website: "\u0421\u0430\u0439\u0442",
  rate: "\u041e\u0446\u0435\u043d\u0438\u0442\u044c",
  share: "\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f",
  contactDevelopers: "\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0447\u0438\u043a\u0430\u043c",
  privacyPolicy: "\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438",
  version: "\u0412\u0435\u0440\u0441\u0438\u044f",
  soundSelection: "\u0412\u044b\u0431\u043e\u0440 \u0437\u0432\u0443\u043a\u0430",
};

function getCopy(languageId: string) {
  return languageId === "ru" ? ruCopy : enCopy;
}

const languages: LanguageOption[] = [
  { id: "en", label: "English", speechLang: "en-US" },
  { id: "es", label: "Español", speechLang: "es-ES" },
  { id: "de", label: "Deutsch", speechLang: "de-DE" },
  { id: "pl", label: "Polish", speechLang: "pl-PL" },
  { id: "ru", label: "Русский", speechLang: "ru-RU" },
  { id: "fr", label: "Français", speechLang: "fr-FR" },
  { id: "zh-Hant", label: "中文(繁體)", speechLang: "zh-TW" },
  { id: "zh-Hans", label: "中文(简体)", speechLang: "zh-CN" },
  { id: "th", label: "ไทย", speechLang: "th-TH" },
  { id: "ar", label: "العربية", speechLang: "ar-SA" },
  { id: "hi", label: "हिन्दी", speechLang: "hi-IN" },
  { id: "pt", label: "Português", speechLang: "pt-PT" },
  { id: "uk", label: "Українська", speechLang: "uk-UA" },
  { id: "be", label: "Беларуская", speechLang: "be-BY" },
  { id: "bs", label: "Bosanski", speechLang: "bs-BA" },
  { id: "it", label: "Italiano", speechLang: "it-IT" },
  { id: "fi", label: "Suomi", speechLang: "fi-FI" },
  { id: "vi", label: "Tiếng Việt", speechLang: "vi-VN" },
];

const languageLabels: Record<string, string> = {
  en: "English",
  es: "Espa\u00f1ol",
  de: "Deutsch",
  pl: "Polish",
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  fr: "Fran\u00e7ais",
  "zh-Hant": "\u4e2d\u6587(\u7e41\u9ad4)",
  "zh-Hans": "\u4e2d\u6587(\u7b80\u4f53)",
  th: "\u0e44\u0e17\u0e22",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
  hi: "\u0939\u093f\u0928\u094d\u0926\u0940",
  pt: "Portugu\u00eas",
  uk: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
  be: "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f",
  bs: "Bosanski",
  it: "Italiano",
  fi: "Suomi",
  vi: "Ti\u1ebfng Vi\u1ec7t",
};

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

function normalizeLanguage(value: string | null) {
  if (!value) {
    return "en";
  }

  const aliases: Record<string, string> = {
    Espanol: "es",
    Russkii: "ru",
    Francais: "fr",
    "Chinese Traditional": "zh-Hant",
    "Chinese Simplified": "zh-Hans",
    Thai: "th",
    Arabic: "ar",
    Hindi: "hi",
    Portuguese: "pt",
    Ukrainian: "uk",
    Belarusian: "be",
    "Tieng Viet": "vi",
  };

  return (
    languages.find((language) => language.id === value || language.label === value)?.id ??
    aliases[value] ??
    "en"
  );
}

function formatSettingTime(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sanitizeTimerSettings(timer: TimerSettings): TimerSettings {
  const rounds = clamp(Math.round(timer.rounds), 1, 99);
  const roundSeconds = clamp(Math.round(timer.roundSeconds), 1, 7200);
  const restSeconds = clamp(Math.round(timer.restSeconds), 0, 3600);

  return {
    prepareSeconds: clamp(Math.round(timer.prepareSeconds), 0, 3600),
    rounds,
    roundSeconds,
    restSeconds,
    warningSeconds: clamp(Math.round(timer.warningSeconds), 0, roundSeconds),
    intervalSignalSeconds: clamp(Math.round(timer.intervalSignalSeconds), 0, roundSeconds),
    restEndWarningSeconds: clamp(Math.round(timer.restEndWarningSeconds), 0, restSeconds),
  };
}

function timersEqual(first: TimerSettings, second: TimerSettings) {
  return JSON.stringify(sanitizeTimerSettings(first)) === JSON.stringify(sanitizeTimerSettings(second));
}

function getLanguage(languageId: string) {
  const language = languages.find((item) => item.id === languageId) ?? languages[0];
  return { ...language, label: languageLabels[language.id] ?? language.label };
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileTimerDrafts, setProfileTimerDrafts] = useState<Record<string, TimerSettings>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    setActiveProfileId(
      loadedProfiles.some((profile) => profile.id === savedActiveProfile)
        ? savedActiveProfile!
        : loadedProfiles[0]?.id ?? defaultProfiles[0].id,
    );
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
  const copy = useMemo(() => getCopy(language), [language]);

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
        const nextTimer = sanitizeTimerSettings({ ...profile.timer, ...patch });
        return normalizeFlexibleRounds(
          {
            ...profile,
            timer: nextTimer,
          },
          nextTimer.rounds,
        );
      });
    },
    [updateActiveProfile],
  );

  const updateProfileTimer = useCallback(
    (profileId: string, patch: Partial<Profile["timer"]>) => {
      setProfiles((current) =>
        current.map((profile) => {
          if (profile.id !== profileId) {
            return profile;
          }

          const timer = sanitizeTimerSettings({ ...profile.timer, ...patch });
          return normalizeFlexibleRounds({ ...profile, timer }, timer.rounds);
        }),
      );
    },
    [],
  );

  const beginProfileEdit = useCallback((profile: Profile) => {
    setEditingProfileId(profile.id);
    setProfileTimerDrafts((current) => ({
      ...current,
      [profile.id]: current[profile.id] ?? { ...profile.timer },
    }));
  }, []);

  const openActiveProfileSettings = useCallback(() => {
    beginProfileEdit(activeProfile);
    setView("profiles");
  }, [activeProfile, beginProfileEdit]);

  const updateProfileTimerDraft = useCallback(
    (profile: Profile, patch: Partial<Profile["timer"]>) => {
      setProfileTimerDrafts((current) => {
        const baseTimer = current[profile.id] ?? profile.timer;
        return {
          ...current,
          [profile.id]: sanitizeTimerSettings({ ...baseTimer, ...patch }),
        };
      });
    },
    [],
  );

  const saveProfileTimerDraft = useCallback(
    (profile: Profile) => {
      const draft = profileTimerDrafts[profile.id];
      if (!draft) {
        return;
      }

      updateProfileTimer(profile.id, draft);
      setProfileTimerDrafts((current) => {
        const next = { ...current };
        delete next[profile.id];
        return next;
      });
      setEditingProfileId(null);
    },
    [profileTimerDrafts, updateProfileTimer],
  );

  const discardProfileTimerDraft = useCallback((profileId: string) => {
    setProfileTimerDrafts((current) => {
      const next = { ...current };
      delete next[profileId];
      return next;
    });
    setEditingProfileId(null);
  }, []);

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
      const nextFullscreen = !(await appWindow.isFullscreen());
      await appWindow.setFullscreen(nextFullscreen);
      setIsFullscreen(nextFullscreen);
      return;
    } catch {
      // Browser preview fallback.
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
      return;
    }

    await document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => undefined);
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
      setProfileMenuOpen(false);
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
      setProfileTimerDrafts((current) => {
        const next = { ...current };
        delete next[profileId];
        return next;
      });
    },
    [activeProfileId, profiles.length],
  );

  const handleOpenExternal = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
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
      <SettingsLayout backLabel={copy.back} title={copy.settings} onBack={() => setView("timer")}>
        <div className="settings-shortcuts" aria-label="Settings shortcuts">
          <button type="button" onClick={() => setView("languages")}>
            <span>{copy.interfaceLanguage}</span>
            <strong>{activeLanguage.label}</strong>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedSoundEvent("roundStart");
              setView("soundPicker");
            }}
          >
            <span>{copy.soundSettings}</span>
            <strong>{copy.sixEventsCustomFiles}</strong>
          </button>
          <button type="button" onClick={() => setView("timerScreen")}>
            <span>{copy.timerScreen}</span>
            <strong>{copy.displayColorsFonts}</strong>
          </button>
        </div>
        <Section title={copy.profile}>
          <SettingsRow
            detail={activeProfile.name}
            label={copy.profile}
            onClick={() => setView("profiles")}
          />
          <StepperNumberRow
            label={copy.rounds}
            max={99}
            min={1}
            value={activeProfile.timer.rounds}
            onChange={(rounds) => updateTimer({ rounds })}
          />
          <TimeRow
            label={copy.roundTime}
            max={7200}
            min={5}
            seconds={activeProfile.timer.roundSeconds}
            step={30}
            onChange={(roundSeconds) => updateTimer({ roundSeconds })}
          />
          <TimeRow
            label={copy.restTime}
            max={3600}
            seconds={activeProfile.timer.restSeconds}
            step={5}
            onChange={(restSeconds) => updateTimer({ restSeconds })}
          />
          <TimeRow
            label={copy.prepareTime}
            max={600}
            seconds={activeProfile.timer.prepareSeconds}
            step={5}
            onChange={(prepareSeconds) => updateTimer({ prepareSeconds })}
          />
          <TimeRow
            detail="Signal before the round ends"
            label={copy.roundEndWarning}
            max={300}
            seconds={activeProfile.timer.warningSeconds}
            step={5}
            onChange={(warningSeconds) => updateTimer({ warningSeconds })}
          />
          <TimeRow
            detail="Repeating signal during a round. Set 00:00 to disable."
            label={copy.signalInsideRound}
            max={600}
            seconds={activeProfile.timer.intervalSignalSeconds}
            step={5}
            onChange={(intervalSignalSeconds) => updateTimer({ intervalSignalSeconds })}
          />
          <ToggleRow
            checked={activeProfile.timer.restEndWarningSeconds > 0}
            detail="Sounds 10 seconds before rest ends"
            label={copy.restEndWarning}
            onChange={(enabled) => updateTimer({ restEndWarningSeconds: enabled ? 10 : 0 })}
          />
          <SettingsRow
            detail={activeProfile.flexibleRoundsEnabled ? copy.enabled : copy.disabled}
            label={copy.flexibleRounds}
            onClick={() => setView("flexibleRounds")}
          />
        </Section>

        <Section title={copy.soundSelection}>
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

        <Section title={copy.languageVoice}>
          <SettingsRow detail={activeLanguage.label} label={copy.interfaceLanguage} onClick={() => setView("languages")} />
          <SettingsRow
            detail={activeProfile.voice.voiceName || copy.auto}
            label={copy.voice}
            onClick={() => setView("voice")}
          />
          <ToggleRow
            checked={activeProfile.voice.announceRound}
            detail="Voice announces the round number at the start"
            label={copy.announceRoundNumber}
            onChange={(announceRound) => updateVoice({ announceRound })}
          />
          <NumberRow
            detail="Voice countdown before round ends"
            label={copy.roundCountdown}
            max={60}
            min={0}
            value={activeProfile.voice.roundCountdownSeconds}
            onChange={(roundCountdownSeconds) => updateVoice({ roundCountdownSeconds })}
          />
          <NumberRow
            detail="Voice countdown before rest ends"
            label={copy.restCountdown}
            max={60}
            min={0}
            value={activeProfile.voice.restCountdownSeconds}
            onChange={(restCountdownSeconds) => updateVoice({ restCountdownSeconds })}
          />
          <SettingsRow
            detail={activeProfile.voice.voiceControl ? copy.on : copy.off}
            label={copy.voiceControl}
            onClick={() => updateVoice({ voiceControl: !activeProfile.voice.voiceControl })}
          />
        </Section>

        <Section title={copy.displayBehavior}>
          <SettingsRow
            detail="Timer appearance, colors, fonts and layout"
            label={copy.timerScreen}
            onClick={() => setView("timerScreen")}
          />
          <SelectRow
            label={copy.theme}
            options={["dark", "light", "system"]}
            value={activeProfile.theme.mode}
            onChange={(mode) => updateTheme({ mode: mode as Profile["theme"]["mode"] })}
          />
          <ToggleRow
            checked={activeProfile.display.preventSleep}
            detail="Keep the screen awake while training"
            label={copy.preventSleep}
            onChange={(preventSleep) => updateDisplay({ preventSleep })}
          />
        </Section>

        <Section title={copy.about}>
          <IconRow
            label={copy.website}
            value="matclock.online"
            onClick={() => handleOpenExternal("https://matclock.online")}
          />
          <IconRow label={copy.rate} value="Coming soon" />
          <IconRow
            label={copy.share}
            value="matclock.online"
            onClick={() => handleOpenExternal("https://matclock.online")}
          />
          <IconRow
            label={copy.contactDevelopers}
            value="support@matclock.online"
            onClick={() => handleOpenExternal("mailto:support@matclock.online")}
          />
          <IconRow
            label={copy.privacyPolicy}
            value="Local profiles only"
            onClick={() => handleOpenExternal("https://matclock.online/privacy")}
          />
          <IconRow label={copy.version} value={APP_VERSION} />
        </Section>
      </SettingsLayout>
    );
  }

  if (view === "profiles") {
    return (
      <SettingsLayout
        action={<button className="accent-small" type="button" onClick={handleCreateProfile}>{copy.createNew}</button>}
        backLabel={copy.back}
        title={copy.profiles}
        onBack={() => setView("settings")}
      >
        <div className="mat-list profile-list">
          {profiles.map((profile) => {
            const draftTimer = profileTimerDrafts[profile.id] ?? profile.timer;
            const hasChanges = !timersEqual(draftTimer, profile.timer);

            return (
            <div className="profile-editor-item" key={profile.id}>
              <div className="profile-select-row">
                <span>
                  <input
                    aria-label="Profile name"
                    type="text"
                    value={profile.name}
                    onChange={(event) => handleRenameProfile(profile.id, event.target.value)}
                  />
                  <small>
                    {copy.rounds}: {profile.timer.rounds} / {copy.round}: {formatTime(profile.timer.roundSeconds)} / {copy.rest}:{" "}
                    {formatTime(profile.timer.restSeconds)}
                  </small>
                </span>
                <div className="profile-actions">
                  {profile.id === activeProfile.id ? (
                    <b>{copy.selected}</b>
                  ) : (
                    <button type="button" onClick={() => handleSelectProfile(profile.id)}>
                      {copy.select}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProfileId === profile.id && !hasChanges) {
                        setEditingProfileId(null);
                        return;
                      }
                      beginProfileEdit(profile);
                    }}
                  >
                    {editingProfileId === profile.id ? copy.done : copy.edit}
                  </button>
                  <button type="button" onClick={() => handleDuplicateProfile(profile)}>
                    {copy.duplicate}
                  </button>
                  <button
                    disabled={profiles.length <= 1}
                    type="button"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    {copy.delete}
                  </button>
                </div>
              </div>
              {editingProfileId === profile.id && (
                <div className="profile-edit-panel">
                  <StepperNumberRow
                    label={copy.rounds}
                    max={99}
                    min={1}
                    value={draftTimer.rounds}
                    onChange={(rounds) => updateProfileTimerDraft(profile, { rounds })}
                  />
                  <TimeRow
                    label={copy.roundTime}
                    max={7200}
                    min={5}
                    seconds={draftTimer.roundSeconds}
                    step={30}
                    onChange={(roundSeconds) => updateProfileTimerDraft(profile, { roundSeconds })}
                  />
                  <TimeRow
                    label={copy.restTime}
                    max={3600}
                    seconds={draftTimer.restSeconds}
                    step={5}
                    onChange={(restSeconds) => updateProfileTimerDraft(profile, { restSeconds })}
                  />
                  <TimeRow
                    label={copy.prepareTime}
                    max={600}
                    seconds={draftTimer.prepareSeconds}
                    step={5}
                    onChange={(prepareSeconds) => updateProfileTimerDraft(profile, { prepareSeconds })}
                  />
                  <TimeRow
                    detail="Signal before the round ends"
                    label={copy.roundEndWarning}
                    max={300}
                    seconds={draftTimer.warningSeconds}
                    step={5}
                    onChange={(warningSeconds) => updateProfileTimerDraft(profile, { warningSeconds })}
                  />
                  <TimeRow
                    detail="Repeating signal during a round. Set 00:00 to disable."
                    label={copy.signalInsideRound}
                    max={600}
                    seconds={draftTimer.intervalSignalSeconds}
                    step={5}
                    onChange={(intervalSignalSeconds) => updateProfileTimerDraft(profile, { intervalSignalSeconds })}
                  />
                  <ToggleRow
                    checked={draftTimer.restEndWarningSeconds > 0}
                    detail="Sounds 10 seconds before rest ends"
                    label={copy.restEndWarning}
                    onChange={(enabled) =>
                      updateProfileTimerDraft(profile, { restEndWarningSeconds: enabled ? 10 : 0 })
                    }
                  />
                  {hasChanges && (
                    <div className="profile-save-notice">
                      <span>
                        <strong>{copy.saveProfileChanges}</strong>
                        <small>{copy.unsavedProfileChanges}</small>
                      </span>
                      <div>
                        <button type="button" onClick={() => discardProfileTimerDraft(profile.id)}>
                          {copy.discard}
                        </button>
                        <button className="notice-primary" type="button" onClick={() => saveProfileTimerDraft(profile)}>
                          {copy.save}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )})}
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
              max={7200}
              min={5}
              seconds={round.roundSeconds}
              step={30}
              onChange={(roundSeconds) => updateFlexibleRound(index, { roundSeconds })}
            />
            {index < activeProfile.timer.rounds - 1 && (
              <TimeRow
                marker="red"
                label="Rest"
                max={3600}
                seconds={round.restSeconds}
                step={5}
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
      <SettingsLayout backLabel={copy.back} title={copy.interfaceLanguage} onBack={() => setView("settings")}>
        <div className="mat-list">
          {languages.map((item) => {
            const cleanLanguage = getLanguage(item.id);
            return (
            <label className="radio-row" key={item.id}>
              <input
                checked={item.id === language}
                name="language"
                type="radio"
                onChange={() => setLanguage(item.id)}
              />
              <span>{cleanLanguage.label}</span>
            </label>
          )})}
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
          <button type="button" onClick={() => setView("settings")}>{copy.settings}</button>
        </nav>
      </header>

      <section className="timer-dashboard">
        <aside className="session-sidebar">
          <div className="total-card">
            <span className="panel-label">{copy.totalTime}</span>
            <strong>
              {formatTime(
                activeProfile.display.countUpTotalTime
                  ? elapsed
                  : activeProfile.display.showTotalTime
                    ? totalLeft
                    : totalDuration,
              )}
            </strong>
          </div>
          <div className="session-summary">
            <button className="summary-card" type="button" onClick={openActiveProfileSettings}>
              <span>{copy.round}</span>
              <strong>{formatTime(activeProfile.timer.roundSeconds)}</strong>
            </button>
            <button className="summary-card" type="button" onClick={openActiveProfileSettings}>
              <span>{copy.rest}</span>
              <strong>{formatTime(activeProfile.timer.restSeconds)}</strong>
            </button>
            <div className="profile-picker summary-profile">
              <button type="button" onClick={() => setProfileMenuOpen((open) => !open)}>
                <span>{copy.profile}</span>
                <strong>{activeProfile.name}</strong>
                <b>{profileMenuOpen ? "^" : "v"}</b>
              </button>
              {profileMenuOpen && (
                <div className="profile-menu">
                  {profiles.map((profile) => (
                    <button
                      className={profile.id === activeProfile.id ? "is-active" : ""}
                      key={profile.id}
                      type="button"
                      onClick={() => handleSelectProfile(profile.id)}
                    >
                      <strong>{profile.name}</strong>
                      <small>
                        {copy.round} {formatTime(profile.timer.roundSeconds)} / {copy.rest} {formatTime(profile.timer.restSeconds)}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                  ? `${getPhaseLabel(copy, displayedPhase)} / ${String(snapshot.round).padStart(2, "0")}/${String(
                      activeProfile.timer.rounds,
                    ).padStart(2, "0")}`
                  : getPhaseLabel(copy, displayedPhase)}
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
                {activeProfile.theme.startButtonText === "Fight!" ? copy.fight : activeProfile.theme.startButtonText} <KeyBadge>Space</KeyBadge>
              </button>
            )}
            {runState === "running" && (
              <button className="primary-action is-running" type="button" onClick={handlePause}>
                {copy.pause} <KeyBadge>Space</KeyBadge>
              </button>
            )}
            {runState === "paused" && (
              <button className="primary-action" type="button" onClick={handleResume}>
                {copy.resume} <KeyBadge>Space</KeyBadge>
              </button>
            )}
            <button className="secondary-action" type="button" onClick={handleReset}>
              {copy.reset} <KeyBadge>R</KeyBadge>
            </button>
            <button className="maximize-action" type="button" onClick={handleFullscreen}>
              {isFullscreen ? copy.minimize : copy.maximize} <KeyBadge>F</KeyBadge>
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

function getPhaseLabel(copy: UiCopy, phase: TimerPhase | "paused") {
  const labels: Record<TimerPhase | "paused", string> = {
    idle: copy.ready,
    prepare: copy.prepare,
    round: copy.round,
    warning: copy.warning,
    rest: copy.rest,
    finished: copy.finished,
    paused: copy.paused,
  };

  return labels[phase];
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
  backLabel = "Back",
  children,
  title,
  onBack,
}: {
  action?: ReactNode;
  backLabel?: string;
  children: ReactNode;
  title: string;
  onBack: () => void;
}) {
  return (
    <main className="settings-screen">
      <header className="settings-header">
        <button className="back-button" type="button" onClick={onBack}>{backLabel}</button>
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

function StepperNumberRow({
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
  const update = (nextValue: number) => onChange(clamp(Math.round(nextValue), min, max));

  return (
    <div className="settings-row is-static settings-stepper-row">
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <div className="desktop-stepper" aria-label={label}>
        <button
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          type="button"
          onClick={() => update(value - 1)}
        >
          -
        </button>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <button
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          type="button"
          onClick={() => update(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TimeRow({
  detail,
  label,
  max = 7200,
  min = 0,
  marker,
  seconds,
  step = 5,
  onChange,
}: {
  detail?: string;
  label: string;
  max?: number;
  min?: number;
  marker?: "green" | "red";
  seconds: number;
  step?: number;
  onChange: (seconds: number) => void;
}) {
  const update = (nextSeconds: number) => onChange(clamp(Math.round(nextSeconds), min, max));

  return (
    <div className={`settings-row is-static settings-stepper-row${marker ? ` marker-${marker}` : ""}`}>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <div className="desktop-stepper" aria-label={label}>
        <button
          aria-label={`Decrease ${label}`}
          disabled={seconds <= min}
          type="button"
          onClick={() => update(seconds - step)}
        >
          -
        </button>
        <strong>{formatSettingTime(seconds)}</strong>
        <button
          aria-label={`Increase ${label}`}
          disabled={seconds >= max}
          type="button"
          onClick={() => update(seconds + step)}
        >
          +
        </button>
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
