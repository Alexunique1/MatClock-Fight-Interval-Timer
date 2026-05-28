import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
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
const APP_VERSION = "0.1.14";
const SITE_URL = "https://www.matclock.online/";
const ROUND_ANNOUNCE_LEAD_SECONDS = 5;
const soundEvents: SoundEvent[] = [
  "roundStart",
  "restStart",
  "finish",
  "roundWarning",
  "restWarning",
  "intervalSignal",
];

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
  add: string;
  alwaysOnTop: string;
  builtInSounds: string;
  buttonColor: string;
  buttonHeight: string;
  buttonText: string;
  cardFont: string;
  colors: string;
  comingSoon: string;
  copyLink: string;
  countUpTimer: string;
  display: string;
  fightLabel: string;
  finishSound: string;
  flexibleTime: string;
  flexibleTimeDetail: string;
  fonts: string;
  intervalSignalSound: string;
  keepScreenAwakeDetail: string;
  layout: string;
  linkCopied: string;
  localProfilesOnly: string;
  microphoneRequired: string;
  mode: string;
  noSound: string;
  privacy: string;
  profileName: string;
  requestingMicrophone: string;
  resetColors: string;
  resetSettings: string;
  restStartSound: string;
  roundSettings: string;
  roundStartSound: string;
  selectedSound: string;
  shareWebsite: string;
  signalInsideRoundDetail: string;
  startButton: string;
  systemVoices: string;
  testVoice: string;
  themeDark: string;
  themeLight: string;
  timerAppearanceDetail: string;
  timerFont: string;
  timerScreenTitle: string;
  topRowHeight: string;
  voiceCommandError: string;
  voiceControlUnavailable: string;
  voiceCountdownRoundDetail: string;
  voiceCountdownRestDetail: string;
  voicePrompts: string;
  voicePromptsDetail: string;
  voiceRoundAnnounceDetail: string;
  warningSound: string;
  openSpeechSettings: string;
  speechSettingsHint: string;
  showRoundNumber: string;
  showRoundNumberDetail: string;
  showTotalTime: string;
  showTotalTimeDetail: string;
};

type DesktopSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event?: { error?: string }) => void) | null;
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
  add: "+ Add",
  alwaysOnTop: "Always on top",
  builtInSounds: "Built-in sounds",
  buttonColor: "Button color",
  buttonHeight: "Button height",
  buttonText: "Button text",
  cardFont: "Card font",
  colors: "Colors",
  comingSoon: "Coming soon",
  copyLink: "Copy link",
  countUpTimer: "Count up timer",
  display: "Display",
  fightLabel: "Fight",
  finishSound: "Finish",
  flexibleTime: "Flexible time",
  flexibleTimeDetail: "Set unique round and rest duration for each round",
  fonts: "Fonts",
  intervalSignalSound: "Interval signal",
  keepScreenAwakeDetail: "Keep the screen awake while training",
  layout: "Layout",
  linkCopied: "Link copied",
  localProfilesOnly: "Local profiles only",
  microphoneRequired: "Microphone permission is required",
  mode: "Mode",
  noSound: "No sound",
  privacy: "Privacy",
  profileName: "Profile name",
  requestingMicrophone: "Requesting microphone...",
  resetColors: "Reset colors",
  resetSettings: "Reset settings",
  restStartSound: "Rest start",
  roundSettings: "Round settings",
  roundStartSound: "Round start",
  selectedSound: "Selected",
  shareWebsite: "Share MatClock",
  signalInsideRoundDetail: "Repeating signal during a round. Set 00:00 to disable.",
  startButton: "Start button",
  systemVoices: "System voices",
  testVoice: "Test voice",
  themeDark: "Dark",
  themeLight: "Light",
  timerAppearanceDetail: "Timer appearance, colors, fonts and layout",
  timerFont: "Timer font",
  timerScreenTitle: "Timer screen",
  topRowHeight: "Top row height",
  voiceCommandError: "Voice command error",
  voiceControlUnavailable: "Voice control is not available",
  voiceCountdownRoundDetail: "Voice countdown before round ends",
  voiceCountdownRestDetail: "Voice countdown before rest ends",
  voicePrompts: "Voice prompts",
  voicePromptsDetail: "Enable spoken round announcements and countdowns",
  voiceRoundAnnounceDetail: "Voice announces the round number 5 seconds before the round starts",
  warningSound: "Before round end",
  openSpeechSettings: "Open speech settings",
  speechSettingsHint: "To add voices in more languages, install speech language packs in Windows settings.",
  showRoundNumber: "Show round number",
  showRoundNumberDetail: "Show current round indicator",
  showTotalTime: "Show total time",
  showTotalTimeDetail: "Show remaining total workout time",
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
  add: "+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
  alwaysOnTop: "\u041f\u043e\u0432\u0435\u0440\u0445 \u0432\u0441\u0435\u0445 \u043e\u043a\u043e\u043d",
  builtInSounds: "\u0412\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u044b\u0435 \u0437\u0432\u0443\u043a\u0438",
  buttonColor: "\u0426\u0432\u0435\u0442 \u043a\u043d\u043e\u043f\u043a\u0438",
  buttonHeight: "\u0412\u044b\u0441\u043e\u0442\u0430 \u043a\u043d\u043e\u043f\u043e\u043a",
  buttonText: "\u0422\u0435\u043a\u0441\u0442 \u043a\u043d\u043e\u043f\u043a\u0438",
  cardFont: "\u0428\u0440\u0438\u0444\u0442 \u043a\u0430\u0440\u0442\u043e\u0447\u0435\u043a",
  colors: "\u0426\u0432\u0435\u0442\u0430",
  comingSoon: "\u0421\u043a\u043e\u0440\u043e",
  copyLink: "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443",
  countUpTimer: "\u041f\u0440\u044f\u043c\u043e\u0439 \u043e\u0442\u0441\u0447\u0435\u0442 \u0442\u0430\u0439\u043c\u0435\u0440\u0430",
  display: "\u041e\u0442\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435",
  fightLabel: "\u0411\u043e\u0439",
  finishSound: "\u0424\u0438\u043d\u0438\u0448",
  flexibleTime: "\u0413\u0438\u0431\u043a\u043e\u0435 \u0432\u0440\u0435\u043c\u044f",
  flexibleTimeDetail: "\u0417\u0430\u0434\u0430\u0442\u044c \u0441\u0432\u043e\u0435 \u0432\u0440\u0435\u043c\u044f \u0440\u0430\u0443\u043d\u0434\u0430 \u0438 \u043e\u0442\u0434\u044b\u0445\u0430 \u0434\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0433\u043e \u0440\u0430\u0443\u043d\u0434\u0430",
  fonts: "\u0428\u0440\u0438\u0444\u0442\u044b",
  intervalSignalSound: "\u0421\u0438\u0433\u043d\u0430\u043b \u0432\u043d\u0443\u0442\u0440\u0438 \u0440\u0430\u0443\u043d\u0434\u0430",
  keepScreenAwakeDetail: "\u041d\u0435 \u0433\u0430\u0441\u0438\u0442\u044c \u044d\u043a\u0440\u0430\u043d \u0432\u043e \u0432\u0440\u0435\u043c\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438",
  layout: "\u041c\u0430\u043a\u0435\u0442",
  linkCopied: "\u0421\u0441\u044b\u043b\u043a\u0430 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0430",
  localProfilesOnly: "\u0422\u043e\u043b\u044c\u043a\u043e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u0438",
  microphoneRequired: "\u041d\u0443\u0436\u043d\u043e \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d",
  mode: "\u0420\u0435\u0436\u0438\u043c",
  noSound: "\u0411\u0435\u0437 \u0437\u0432\u0443\u043a\u0430",
  privacy: "\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c",
  profileName: "\u0418\u043c\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u044f",
  requestingMicrophone: "\u0417\u0430\u043f\u0440\u043e\u0441 \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0430...",
  resetColors: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0446\u0432\u0435\u0442\u0430",
  resetSettings: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
  restStartSound: "\u041d\u0430\u0447\u0430\u043b\u043e \u043e\u0442\u0434\u044b\u0445\u0430",
  roundSettings: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0440\u0430\u0443\u043d\u0434\u043e\u0432",
  roundStartSound: "\u041d\u0430\u0447\u0430\u043b\u043e \u0440\u0430\u0443\u043d\u0434\u0430",
  selectedSound: "\u0412\u044b\u0431\u0440\u0430\u043d",
  shareWebsite: "\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f MatClock",
  signalInsideRoundDetail: "\u041f\u043e\u0432\u0442\u043e\u0440\u044f\u044e\u0449\u0438\u0439\u0441\u044f \u0441\u0438\u0433\u043d\u0430\u043b \u0432\u043d\u0443\u0442\u0440\u0438 \u0440\u0430\u0443\u043d\u0434\u0430. 00:00 \u043e\u0442\u043a\u043b\u044e\u0447\u0430\u0435\u0442.",
  startButton: "\u041a\u043d\u043e\u043f\u043a\u0430 \u0441\u0442\u0430\u0440\u0442\u0430",
  systemVoices: "\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 \u0433\u043e\u043b\u043e\u0441\u0430",
  testVoice: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0433\u043e\u043b\u043e\u0441",
  themeDark: "\u0422\u0435\u043c\u043d\u0430\u044f",
  themeLight: "\u0421\u0432\u0435\u0442\u043b\u0430\u044f",
  timerAppearanceDetail: "\u0412\u0438\u0434 \u0442\u0430\u0439\u043c\u0435\u0440\u0430, \u0446\u0432\u0435\u0442\u0430, \u0448\u0440\u0438\u0444\u0442\u044b \u0438 \u043c\u0430\u043a\u0435\u0442",
  timerFont: "\u0428\u0440\u0438\u0444\u0442 \u0442\u0430\u0439\u043c\u0435\u0440\u0430",
  timerScreenTitle: "\u042d\u043a\u0440\u0430\u043d \u0442\u0430\u0439\u043c\u0435\u0440\u0430",
  topRowHeight: "\u0412\u044b\u0441\u043e\u0442\u0430 \u0432\u0435\u0440\u0445\u043d\u0435\u0439 \u0441\u0442\u0440\u043e\u043a\u0438",
  voiceCommandError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b",
  voiceControlUnavailable: "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e",
  voiceCountdownRoundDetail: "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u043e\u0442\u0441\u0447\u0435\u0442 \u0434\u043e \u043a\u043e\u043d\u0446\u0430 \u0440\u0430\u0443\u043d\u0434\u0430",
  voiceCountdownRestDetail: "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u043e\u0442\u0441\u0447\u0435\u0442 \u0434\u043e \u043a\u043e\u043d\u0446\u0430 \u043e\u0442\u0434\u044b\u0445\u0430",
  voicePrompts: "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u044b\u0435 \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438",
  voicePromptsDetail: "\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043e\u0437\u0432\u0443\u0447\u043a\u0443 \u0440\u0430\u0443\u043d\u0434\u043e\u0432 \u0438 \u043e\u0442\u0441\u0447\u0435\u0442\u0430",
  voiceRoundAnnounceDetail: "\u0413\u043e\u043b\u043e\u0441 \u043d\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0440\u0430\u0443\u043d\u0434 \u0437\u0430 5 \u0441\u0435\u043a\u0443\u043d\u0434 \u0434\u043e \u0441\u0442\u0430\u0440\u0442\u0430",
  warningSound: "\u041f\u0435\u0440\u0435\u0434 \u043a\u043e\u043d\u0446\u043e\u043c \u0440\u0430\u0443\u043d\u0434\u0430",
  openSpeechSettings: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0440\u0435\u0447\u0438",
  speechSettingsHint: "\u0427\u0442\u043e\u0431\u044b \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0433\u043e\u043b\u043e\u0441\u0430 \u0434\u043b\u044f \u0434\u0440\u0443\u0433\u0438\u0445 \u044f\u0437\u044b\u043a\u043e\u0432, \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435 \u044f\u0437\u044b\u043a\u043e\u0432\u044b\u0435 \u043f\u0430\u043a\u0435\u0442\u044b \u0441 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u043e\u0439 \u0440\u0435\u0447\u0438 \u0432 Windows.",
  showRoundNumber: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0440\u0430\u0443\u043d\u0434\u0430",
  showRoundNumberDetail: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0438\u043d\u0434\u0438\u043a\u0430\u0442\u043e\u0440 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0440\u0430\u0443\u043d\u0434\u0430",
  showTotalTime: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043e\u0431\u0449\u0435\u0435 \u0432\u0440\u0435\u043c\u044f",
  showTotalTimeDetail: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043e\u0441\u0442\u0430\u0432\u0448\u0435\u0435\u0441\u044f \u043e\u0431\u0449\u0435\u0435 \u0432\u0440\u0435\u043c\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438",
};

const localizedCopies: Record<string, Partial<UiCopy>> = {
  ru: ruCopy,
  es: {
    settings: "Configuracion",
    back: "Atras",
    totalTime: "Tiempo total",
    round: "Asalto",
    rounds: "Asaltos",
    rest: "Descanso",
    profile: "Perfil",
    profiles: "Perfiles",
    prepare: "Preparacion",
    warning: "Aviso",
    ready: "Listo",
    paused: "Pausa",
    finished: "Finalizado",
    fight: "Fight!",
    pause: "Pausa",
    resume: "Continuar",
    reset: "Reiniciar",
    maximize: "Maximizar",
    minimize: "Minimizar",
    select: "Elegir",
    selected: "Elegido",
    edit: "Editar",
    done: "Hecho",
    duplicate: "Duplicar",
    delete: "Eliminar",
    createNew: "+ Crear",
    save: "Guardar",
    discard: "Descartar",
    saveProfileChanges: "Guardar cambios del perfil?",
    unsavedProfileChanges: "Se cambiaron los tiempos de este perfil.",
    roundTime: "Tiempo de asalto",
    restTime: "Tiempo de descanso",
    prepareTime: "Preparacion",
    roundEndWarning: "Aviso fin de asalto",
    signalInsideRound: "Senal dentro del asalto",
    restEndWarning: "Aviso fin de descanso",
    flexibleRounds: "Asaltos flexibles",
    enabled: "Activado",
    disabled: "Desactivado",
    interfaceLanguage: "Idioma",
    soundSettings: "Sonidos",
    timerScreen: "Pantalla del timer",
    displayColorsFonts: "Pantalla, colores, fuentes",
    sixEventsCustomFiles: "6 eventos + archivos",
    languageVoice: "Idioma y voz",
    voice: "Voz",
    auto: "Auto",
    announceRoundNumber: "Anunciar numero de asalto",
    roundCountdown: "Cuenta atras asalto",
    restCountdown: "Cuenta atras descanso",
    voiceControl: "Control por voz",
    on: "Si",
    off: "No",
    displayBehavior: "Pantalla y comportamiento",
    theme: "Tema",
    preventSleep: "Mantener pantalla activa",
    about: "Acerca de",
    website: "Sitio web",
    rate: "Valorar",
    share: "Compartir",
    contactDevelopers: "Contactar desarrolladores",
    privacyPolicy: "Privacidad",
    version: "Version",
    soundSelection: "Seleccion de sonido",
  },
  de: {
    settings: "Einstellungen",
    back: "Zuruck",
    totalTime: "Gesamtzeit",
    round: "Runde",
    rounds: "Runden",
    rest: "Pause",
    profile: "Profil",
    profiles: "Profile",
    prepare: "Vorbereitung",
    warning: "Warnung",
    ready: "Bereit",
    paused: "Pausiert",
    finished: "Fertig",
    pause: "Pause",
    resume: "Weiter",
    reset: "Zurucksetzen",
    maximize: "Maximieren",
    minimize: "Minimieren",
    select: "Wahlen",
    selected: "Gewahlt",
    edit: "Bearbeiten",
    done: "Fertig",
    duplicate: "Duplizieren",
    delete: "Loschen",
    createNew: "+ Neu",
    save: "Speichern",
    discard: "Verwerfen",
    saveProfileChanges: "Profilanderungen speichern?",
    unsavedProfileChanges: "Die Zeitwerte dieses Profils wurden geandert.",
    roundTime: "Rundenzeit",
    restTime: "Pausenzeit",
    prepareTime: "Vorbereitung",
    roundEndWarning: "Warnung vor Rundenende",
    signalInsideRound: "Signal in der Runde",
    restEndWarning: "Warnung vor Pausenende",
    flexibleRounds: "Flexible Runden",
    enabled: "Aktiv",
    disabled: "Inaktiv",
    interfaceLanguage: "Sprache",
    soundSettings: "Tone",
    timerScreen: "Timer-Anzeige",
    displayColorsFonts: "Anzeige, Farben, Schriften",
    languageVoice: "Sprache und Stimme",
    voice: "Stimme",
    announceRoundNumber: "Rundennummer ansagen",
    roundCountdown: "Runden-Countdown",
    restCountdown: "Pausen-Countdown",
    voiceControl: "Sprachsteuerung",
    displayBehavior: "Anzeige und Verhalten",
    theme: "Design",
    preventSleep: "Bildschirm wach halten",
    about: "Uber App",
    website: "Webseite",
    rate: "Bewerten",
    share: "Teilen",
    contactDevelopers: "Entwickler kontaktieren",
    privacyPolicy: "Datenschutz",
    soundSelection: "Tonauswahl",
  },
  pl: {
    settings: "Ustawienia",
    back: "Wstecz",
    totalTime: "Czas calkowity",
    round: "Runda",
    rounds: "Rundy",
    rest: "Przerwa",
    profile: "Profil",
    profiles: "Profile",
    prepare: "Przygotowanie",
    warning: "Ostrzezenie",
    ready: "Gotowe",
    paused: "Pauza",
    finished: "Zakonczono",
    pause: "Pauza",
    resume: "Kontynuuj",
    reset: "Reset",
    maximize: "Pelen ekran",
    minimize: "Wyjdz z pelnego",
    select: "Wybierz",
    selected: "Wybrany",
    edit: "Edytuj",
    done: "Gotowe",
    duplicate: "Duplikuj",
    delete: "Usun",
    createNew: "+ Utworz",
    save: "Zapisz",
    discard: "Anuluj",
    saveProfileChanges: "Zapisac zmiany profilu?",
    unsavedProfileChanges: "Zmieniono czasy dla tego profilu.",
    roundTime: "Czas rundy",
    restTime: "Czas przerwy",
    prepareTime: "Przygotowanie",
    roundEndWarning: "Ostrzezenie konca rundy",
    signalInsideRound: "Sygnal w rundzie",
    restEndWarning: "Ostrzezenie konca przerwy",
    flexibleRounds: "Elastyczne rundy",
    enabled: "Wlaczone",
    disabled: "Wylaczone",
    interfaceLanguage: "Jezyk",
    soundSettings: "Dzwieki",
    timerScreen: "Ekran timera",
    displayColorsFonts: "Ekran, kolory, fonty",
    languageVoice: "Jezyk i glos",
    voice: "Glos",
    displayBehavior: "Ekran i zachowanie",
    theme: "Motyw",
    preventSleep: "Nie wygaszaj ekranu",
    about: "O aplikacji",
    website: "Strona",
    rate: "Ocen",
    share: "Udostepnij",
    contactDevelopers: "Kontakt",
    privacyPolicy: "Prywatnosc",
    soundSelection: "Wybor dzwieku",
  },
  fr: {
    settings: "Parametres",
    back: "Retour",
    totalTime: "Temps total",
    round: "Round",
    rounds: "Rounds",
    rest: "Repos",
    profile: "Profil",
    profiles: "Profils",
    prepare: "Preparation",
    warning: "Alerte",
    ready: "Pret",
    paused: "Pause",
    finished: "Termine",
    pause: "Pause",
    resume: "Reprendre",
    reset: "Reinitialiser",
    maximize: "Plein ecran",
    minimize: "Reduire",
    select: "Choisir",
    selected: "Choisi",
    edit: "Modifier",
    done: "Termine",
    duplicate: "Dupliquer",
    delete: "Supprimer",
    createNew: "+ Creer",
    save: "Enregistrer",
    discard: "Annuler",
    saveProfileChanges: "Enregistrer les changements?",
    unsavedProfileChanges: "Les temps de ce profil ont change.",
    roundTime: "Temps du round",
    restTime: "Temps de repos",
    prepareTime: "Preparation",
    roundEndWarning: "Alerte fin de round",
    signalInsideRound: "Signal dans le round",
    restEndWarning: "Alerte fin de repos",
    flexibleRounds: "Rounds flexibles",
    enabled: "Active",
    disabled: "Desactive",
    interfaceLanguage: "Langue",
    soundSettings: "Sons",
    timerScreen: "Ecran du timer",
    displayColorsFonts: "Ecran, couleurs, polices",
    languageVoice: "Langue et voix",
    voice: "Voix",
    displayBehavior: "Affichage et comportement",
    theme: "Theme",
    preventSleep: "Garder l'ecran actif",
    about: "A propos",
    website: "Site web",
    rate: "Noter",
    share: "Partager",
    contactDevelopers: "Contacter",
    privacyPolicy: "Confidentialite",
    soundSelection: "Choix du son",
  },
  pt: {
    settings: "Configuracoes",
    back: "Voltar",
    totalTime: "Tempo total",
    round: "Round",
    rounds: "Rounds",
    rest: "Descanso",
    profile: "Perfil",
    profiles: "Perfis",
    prepare: "Preparacao",
    warning: "Aviso",
    ready: "Pronto",
    paused: "Pausado",
    finished: "Finalizado",
    pause: "Pausar",
    resume: "Continuar",
    reset: "Reiniciar",
    maximize: "Tela cheia",
    minimize: "Minimizar",
    select: "Selecionar",
    selected: "Selecionado",
    edit: "Editar",
    done: "Pronto",
    duplicate: "Duplicar",
    delete: "Excluir",
    createNew: "+ Criar",
    save: "Salvar",
    discard: "Cancelar",
    saveProfileChanges: "Salvar alteracoes do perfil?",
    unsavedProfileChanges: "Os tempos deste perfil foram alterados.",
    roundTime: "Tempo do round",
    restTime: "Tempo de descanso",
    prepareTime: "Preparacao",
    roundEndWarning: "Aviso fim do round",
    signalInsideRound: "Sinal no round",
    restEndWarning: "Aviso fim do descanso",
    flexibleRounds: "Rounds flexiveis",
    enabled: "Ativo",
    disabled: "Inativo",
    interfaceLanguage: "Idioma",
    soundSettings: "Sons",
    timerScreen: "Tela do timer",
    displayColorsFonts: "Tela, cores, fontes",
    languageVoice: "Idioma e voz",
    voice: "Voz",
    displayBehavior: "Tela e comportamento",
    theme: "Tema",
    preventSleep: "Manter tela ativa",
    about: "Sobre",
    website: "Site",
    rate: "Avaliar",
    share: "Compartilhar",
    contactDevelopers: "Contato",
    privacyPolicy: "Privacidade",
    soundSelection: "Selecao de som",
  },
  uk: {
    settings: "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f",
    back: "\u041d\u0430\u0437\u0430\u0434",
    totalTime: "\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0438\u0439 \u0447\u0430\u0441",
    round: "\u0420\u0430\u0443\u043d\u0434",
    rounds: "\u0420\u0430\u0443\u043d\u0434\u0438",
    rest: "\u0412\u0456\u0434\u043f\u043e\u0447\u0438\u043d\u043e\u043a",
    profile: "\u041f\u0440\u043e\u0444\u0456\u043b\u044c",
    profiles: "\u041f\u0440\u043e\u0444\u0456\u043b\u0456",
    prepare: "\u041f\u0456\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
    warning: "\u041f\u043e\u043f\u0435\u0440\u0435\u0434\u0436\u0435\u043d\u043d\u044f",
    ready: "\u0413\u043e\u0442\u043e\u0432\u043e",
    paused: "\u041f\u0430\u0443\u0437\u0430",
    finished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e",
    pause: "\u041f\u0430\u0443\u0437\u0430",
    resume: "\u041f\u0440\u043e\u0434\u043e\u0432\u0436\u0438\u0442\u0438",
    reset: "\u0421\u043a\u0438\u0434\u0430\u043d\u043d\u044f",
    select: "\u0412\u0438\u0431\u0440\u0430\u0442\u0438",
    selected: "\u0412\u0438\u0431\u0440\u0430\u043d\u043e",
    edit: "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438",
    done: "\u0413\u043e\u0442\u043e\u0432\u043e",
    save: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438",
    discard: "\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438",
    roundTime: "\u0427\u0430\u0441 \u0440\u0430\u0443\u043d\u0434\u0443",
    restTime: "\u0427\u0430\u0441 \u0432\u0456\u0434\u043f\u043e\u0447\u0438\u043d\u043a\u0443",
    interfaceLanguage: "\u041c\u043e\u0432\u0430 \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443",
  },
  be: {
    settings: "Налады",
    back: "Назад",
    totalTime: "Агульны час",
    round: "Раўнд",
    rounds: "Раўнды",
    rest: "Адпачынак",
    profile: "Профіль",
    profiles: "Профілі",
    prepare: "Падрыхтоўка",
    warning: "Папярэджанне",
    ready: "Гатова",
    paused: "Паўза",
    finished: "Завершана",
    fight: "Бой!",
    pause: "Паўза",
    resume: "Працягнуць",
    reset: "Скінуць",
    maximize: "На ўвесь экран",
    minimize: "Згарнуць",
    select: "Выбраць",
    selected: "Выбрана",
    edit: "Рэдагаваць",
    done: "Гатова",
    duplicate: "Дубляваць",
    delete: "Выдаліць",
    createNew: "+ Стварыць",
    save: "Захаваць",
    discard: "Адмяніць",
    saveProfileChanges: "Захаваць змены профілю?",
    unsavedProfileChanges: "Часавыя налады гэтага профілю былі зменены.",
    roundTime: "Час раўнда",
    restTime: "Час адпачынку",
    prepareTime: "Падрыхтоўка",
    roundEndWarning: "Сігнал да канца раўнда",
    signalInsideRound: "Сігнал унутры раўнда",
    restEndWarning: "Сігнал да канца адпачынку",
    flexibleRounds: "Гнуткія раўнды",
    enabled: "Уключана",
    disabled: "Выключана",
    interfaceLanguage: "Мова інтэрфейсу",
    soundSettings: "Налады гуку",
    timerScreen: "Экран таймера",
    displayColorsFonts: "Экран, колеры, шрыфты",
    sixEventsCustomFiles: "6 падзей + свае файлы",
    languageVoice: "Мова і голас",
    voice: "Голас",
    auto: "Аўта",
    announceRoundNumber: "Называць нумар раўнда",
    roundCountdown: "Адлік раўнда",
    restCountdown: "Адлік адпачынку",
    voiceControl: "Галасавое кіраванне",
    on: "Укл",
    off: "Выкл",
    displayBehavior: "Экран і паводзіны",
    theme: "Тэма",
    preventSleep: "Не зацямняць экран",
    about: "Аб праграме",
    website: "Сайт",
    rate: "Ацаніць",
    share: "Падзяліцца",
    contactDevelopers: "Напісаць распрацоўшчыкам",
    privacyPolicy: "Палітыка прыватнасці",
    version: "Версія",
    soundSelection: "Выбар гуку",
    add: "+ Дадаць",
    alwaysOnTop: "Па-над усімі вокнамі",
    builtInSounds: "Убудаваныя гукі",
    buttonColor: "Колер кнопкі",
    buttonHeight: "Вышыня кнопак",
    buttonText: "Тэкст кнопкі",
    cardFont: "Шрыфт картак",
    colors: "Колеры",
    comingSoon: "Хутка",
    copyLink: "Скапіяваць спасылку",
    countUpTimer: "Прамы адлік таймера",
    display: "Адлюстраванне",
    fightLabel: "Бой",
    finishSound: "Фініш",
    flexibleTime: "Гнуткі час",
    flexibleTimeDetail: "Задаць асобны час раўнда і адпачынку для кожнага раўнда",
    fonts: "Шрыфты",
    intervalSignalSound: "Сігнал унутры раўнда",
    keepScreenAwakeDetail: "Не гасіць экран падчас трэніроўкі",
    layout: "Макет",
    linkCopied: "Спасылка скапіявана",
    localProfilesOnly: "Толькі лакальныя профілі",
    microphoneRequired: "Патрэбны дазвол на мікрафон",
    mode: "Рэжым",
    noSound: "Без гуку",
    privacy: "Прыватнасць",
    profileName: "Назва профілю",
    requestingMicrophone: "Запыт мікрафона...",
    resetColors: "Скінуць колеры",
    resetSettings: "Скінуць налады",
    restStartSound: "Пачатак адпачынку",
    roundSettings: "Налады раўндаў",
    roundStartSound: "Пачатак раўнда",
    selectedSound: "Выбрана",
    shareWebsite: "Падзяліцца MatClock",
    signalInsideRoundDetail: "Паўторны сігнал унутры раўнда. 00:00 выключае.",
    startButton: "Кнопка старту",
    systemVoices: "Сістэмныя галасы",
    testVoice: "Праверыць голас",
    themeDark: "Цёмная",
    themeLight: "Светлая",
    timerAppearanceDetail: "Выгляд таймера, колеры, шрыфты і макет",
    timerFont: "Шрыфт таймера",
    timerScreenTitle: "Экран таймера",
    topRowHeight: "Вышыня верхняга радка",
    voiceCommandError: "Памылка галасавой каманды",
    voiceControlUnavailable: "Галасавое кіраванне недаступнае",
    voiceCountdownRoundDetail: "Галасавы адлік да канца раўнда",
    voiceCountdownRestDetail: "Галасавы адлік да канца адпачынку",
    voicePrompts: "Галасавыя падказкі",
    voicePromptsDetail: "Уключыць агучванне раўндаў і адліку",
    voiceRoundAnnounceDetail: "Голас называе раўнд за 5 секунд да старту",
    warningSound: "Перад канцом раўнда",
    openSpeechSettings: "Адкрыць налады маўлення",
    speechSettingsHint: "Каб дадаць галасы на іншых мовах, усталюйце моўныя пакеты з падтрымкай маўлення ў наладах Windows.",
    showRoundNumber: "Паказваць нумар раўнда",
    showRoundNumberDetail: "Паказваць індыкатар бягучага раўнда",
    showTotalTime: "Паказваць агульны час",
    showTotalTimeDetail: "Паказваць астатні агульны час трэніроўкі",
  },
  it: {
    settings: "Impostazioni",
    back: "Indietro",
    totalTime: "Tempo totale",
    round: "Round",
    rounds: "Round",
    rest: "Riposo",
    profile: "Profilo",
    profiles: "Profili",
    prepare: "Preparazione",
    warning: "Avviso",
    ready: "Pronto",
    paused: "Pausa",
    finished: "Finito",
    pause: "Pausa",
    resume: "Riprendi",
    reset: "Reset",
    maximize: "Schermo intero",
    minimize: "Riduci",
    select: "Seleziona",
    selected: "Selezionato",
    edit: "Modifica",
    done: "Fatto",
    duplicate: "Duplica",
    delete: "Elimina",
    save: "Salva",
    discard: "Annulla",
    roundTime: "Tempo round",
    restTime: "Tempo riposo",
    interfaceLanguage: "Lingua",
    soundSettings: "Suoni",
    timerScreen: "Schermo timer",
    languageVoice: "Lingua e voce",
    displayBehavior: "Schermo e comportamento",
  },
  fi: {
    settings: "Asetukset",
    back: "Takaisin",
    totalTime: "Kokonaisaika",
    round: "Era",
    rounds: "Erat",
    rest: "Tauko",
    profile: "Profiili",
    profiles: "Profiilit",
    prepare: "Valmistelu",
    warning: "Varoitus",
    pause: "Tauko",
    resume: "Jatka",
    reset: "Nollaa",
    select: "Valitse",
    selected: "Valittu",
    edit: "Muokkaa",
    save: "Tallenna",
    discard: "Peruuta",
    roundTime: "Eran aika",
    restTime: "Tauon aika",
    interfaceLanguage: "Kieli",
    soundSettings: "Aanet",
    timerScreen: "Ajastimen naytto",
  },
  bs: {
    settings: "Postavke",
    back: "Nazad",
    totalTime: "Ukupno vrijeme",
    round: "Runda",
    rounds: "Runde",
    rest: "Odmor",
    profile: "Profil",
    profiles: "Profili",
    prepare: "Priprema",
    warning: "Upozorenje",
    pause: "Pauza",
    resume: "Nastavi",
    reset: "Resetuj",
    select: "Izaberi",
    selected: "Izabrano",
    edit: "Uredi",
    save: "Spremi",
    discard: "Odustani",
    roundTime: "Vrijeme runde",
    restTime: "Vrijeme odmora",
    interfaceLanguage: "Jezik",
  },
  vi: {
    settings: "Cai dat",
    back: "Quay lai",
    totalTime: "Tong thoi gian",
    round: "Hiep",
    rounds: "Cac hiep",
    rest: "Nghi",
    profile: "Ho so",
    profiles: "Ho so",
    prepare: "Chuan bi",
    warning: "Canh bao",
    pause: "Tam dung",
    resume: "Tiep tuc",
    reset: "Dat lai",
    select: "Chon",
    selected: "Da chon",
    edit: "Sua",
    save: "Luu",
    discard: "Huy",
    roundTime: "Thoi gian hiep",
    restTime: "Thoi gian nghi",
    interfaceLanguage: "Ngon ngu",
  },
  "zh-Hans": {
    settings: "\u8bbe\u7f6e",
    back: "\u8fd4\u56de",
    totalTime: "\u603b\u65f6\u95f4",
    round: "\u56de\u5408",
    rounds: "\u56de\u5408",
    rest: "\u4f11\u606f",
    profile: "\u914d\u7f6e",
    profiles: "\u914d\u7f6e",
    prepare: "\u51c6\u5907",
    warning: "\u63d0\u9192",
    ready: "\u5c31\u7eea",
    paused: "\u6682\u505c",
    finished: "\u5b8c\u6210",
    pause: "\u6682\u505c",
    resume: "\u7ee7\u7eed",
    reset: "\u91cd\u7f6e",
    maximize: "\u5168\u5c4f",
    minimize: "\u9000\u51fa\u5168\u5c4f",
    select: "\u9009\u62e9",
    selected: "\u5df2\u9009",
    edit: "\u7f16\u8f91",
    done: "\u5b8c\u6210",
    duplicate: "\u590d\u5236",
    delete: "\u5220\u9664",
    save: "\u4fdd\u5b58",
    discard: "\u53d6\u6d88",
    roundTime: "\u56de\u5408\u65f6\u95f4",
    restTime: "\u4f11\u606f\u65f6\u95f4",
    interfaceLanguage: "\u754c\u9762\u8bed\u8a00",
    soundSettings: "\u58f0\u97f3",
    timerScreen: "\u8ba1\u65f6\u5668\u5c4f\u5e55",
  },
  "zh-Hant": {
    settings: "\u8a2d\u5b9a",
    back: "\u8fd4\u56de",
    totalTime: "\u7e3d\u6642\u9593",
    round: "\u56de\u5408",
    rounds: "\u56de\u5408",
    rest: "\u4f11\u606f",
    profile: "\u8a2d\u5b9a\u6a94",
    profiles: "\u8a2d\u5b9a\u6a94",
    prepare: "\u6e96\u5099",
    warning: "\u63d0\u793a",
    paused: "\u66ab\u505c",
    finished: "\u5b8c\u6210",
    pause: "\u66ab\u505c",
    resume: "\u7e7c\u7e8c",
    reset: "\u91cd\u7f6e",
    maximize: "\u5168\u87a2\u5e55",
    minimize: "\u96e2\u958b\u5168\u87a2\u5e55",
    select: "\u9078\u64c7",
    selected: "\u5df2\u9078",
    edit: "\u7de8\u8f2f",
    save: "\u5132\u5b58",
    discard: "\u53d6\u6d88",
    roundTime: "\u56de\u5408\u6642\u9593",
    restTime: "\u4f11\u606f\u6642\u9593",
    interfaceLanguage: "\u4ecb\u9762\u8a9e\u8a00",
  },
  th: {
    settings: "\u0e01\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32",
    back: "\u0e01\u0e25\u0e31\u0e1a",
    totalTime: "\u0e40\u0e27\u0e25\u0e32\u0e23\u0e27\u0e21",
    round: "\u0e22\u0e01",
    rounds: "\u0e08\u0e33\u0e19\u0e27\u0e19\u0e22\u0e01",
    rest: "\u0e1e\u0e31\u0e01",
    profile: "\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c",
    profiles: "\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c",
    prepare: "\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21",
    warning: "\u0e40\u0e15\u0e37\u0e2d\u0e19",
    pause: "\u0e1e\u0e31\u0e01",
    resume: "\u0e15\u0e48\u0e2d",
    reset: "\u0e23\u0e35\u0e40\u0e0b\u0e47\u0e15",
    select: "\u0e40\u0e25\u0e37\u0e2d\u0e01",
    selected: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27",
    edit: "\u0e41\u0e01\u0e49\u0e44\u0e02",
    save: "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01",
    discard: "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01",
    roundTime: "\u0e40\u0e27\u0e25\u0e32\u0e22\u0e01",
    restTime: "\u0e40\u0e27\u0e25\u0e32\u0e1e\u0e31\u0e01",
    interfaceLanguage: "\u0e20\u0e32\u0e29\u0e32",
  },
  ar: {
    settings: "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    back: "\u0631\u062c\u0648\u0639",
    totalTime: "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0643\u0644\u064a",
    round: "\u062c\u0648\u0644\u0629",
    rounds: "\u062c\u0648\u0644\u0627\u062a",
    rest: "\u0631\u0627\u062d\u0629",
    profile: "\u0645\u0644\u0641",
    profiles: "\u0645\u0644\u0641\u0627\u062a",
    prepare: "\u062a\u062d\u0636\u064a\u0631",
    warning: "\u062a\u0646\u0628\u064a\u0647",
    pause: "\u0625\u064a\u0642\u0627\u0641",
    resume: "\u0645\u062a\u0627\u0628\u0639\u0629",
    reset: "\u0625\u0639\u0627\u062f\u0629",
    select: "\u0627\u062e\u062a\u0631",
    selected: "\u0645\u062d\u062f\u062f",
    edit: "\u062a\u0639\u062f\u064a\u0644",
    save: "\u062d\u0641\u0638",
    discard: "\u0625\u0644\u063a\u0627\u0621",
    roundTime: "\u0648\u0642\u062a \u0627\u0644\u062c\u0648\u0644\u0629",
    restTime: "\u0648\u0642\u062a \u0627\u0644\u0631\u0627\u062d\u0629",
    interfaceLanguage: "\u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629",
  },
  hi: {
    settings: "\u0938\u0947\u091f\u093f\u0902\u0917",
    back: "\u0935\u093e\u092a\u0938",
    totalTime: "\u0915\u0941\u0932 \u0938\u092e\u092f",
    round: "\u0930\u093e\u0909\u0902\u0921",
    rounds: "\u0930\u093e\u0909\u0902\u0921",
    rest: "\u0935\u093f\u0936\u094d\u0930\u093e\u092e",
    profile: "\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932",
    profiles: "\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932",
    prepare: "\u0924\u0948\u092f\u093e\u0930\u0940",
    warning: "\u091a\u0947\u0924\u093e\u0935\u0928\u0940",
    pause: "\u0930\u094b\u0915\u0947\u0902",
    resume: "\u091c\u093e\u0930\u0940",
    reset: "\u0930\u0940\u0938\u0947\u091f",
    select: "\u091a\u0941\u0928\u0947\u0902",
    selected: "\u091a\u0941\u0928\u093e \u0917\u092f\u093e",
    edit: "\u0938\u0902\u092a\u093e\u0926\u093f\u0924",
    save: "\u0938\u0947\u0935",
    discard: "\u0930\u0926\u094d\u0926",
    roundTime: "\u0930\u093e\u0909\u0902\u0921 \u0938\u092e\u092f",
    restTime: "\u0935\u093f\u0936\u094d\u0930\u093e\u092e \u0938\u092e\u092f",
    interfaceLanguage: "\u092d\u093e\u0937\u093e",
  },
};

const localizedCompletionCopies: Record<string, Partial<UiCopy>> = {
  es: {
    fight: "A pelear!",
    add: "+ Agregar",
    alwaysOnTop: "Siempre encima",
    builtInSounds: "Sonidos integrados",
    buttonColor: "Color del boton",
    buttonHeight: "Altura de botones",
    buttonText: "Texto del boton",
    cardFont: "Fuente de tarjetas",
    colors: "Colores",
    comingSoon: "Proximamente",
    copyLink: "Copiar enlace",
    countUpTimer: "Conteo ascendente",
    display: "Visualizacion",
    fightLabel: "Combate",
    finishSound: "Final",
    flexibleTime: "Tiempo flexible",
    flexibleTimeDetail: "Define duraciones distintas de asalto y descanso para cada asalto",
    fonts: "Fuentes",
    intervalSignalSound: "Senal de intervalo",
    keepScreenAwakeDetail: "Mantener la pantalla activa durante el entrenamiento",
    layout: "Diseno",
    linkCopied: "Enlace copiado",
    localProfilesOnly: "Solo perfiles locales",
    microphoneRequired: "Se requiere permiso de microfono",
    mode: "Modo",
    noSound: "Sin sonido",
    privacy: "Privacidad",
    profileName: "Nombre del perfil",
    requestingMicrophone: "Solicitando microfono...",
    resetColors: "Restablecer colores",
    resetSettings: "Restablecer ajustes",
    restStartSound: "Inicio del descanso",
    roundSettings: "Ajustes de asaltos",
    roundStartSound: "Inicio del asalto",
    selectedSound: "Seleccionado",
    shareWebsite: "Compartir MatClock",
    signalInsideRoundDetail: "Senal repetida durante el asalto. Pon 00:00 para desactivar.",
    startButton: "Boton de inicio",
    systemVoices: "Voces del sistema",
    testVoice: "Probar voz",
    themeDark: "Oscuro",
    themeLight: "Claro",
    timerAppearanceDetail: "Apariencia del timer, colores, fuentes y diseno",
    timerFont: "Fuente del timer",
    timerScreenTitle: "Pantalla del timer",
    topRowHeight: "Altura de fila superior",
    voiceCommandError: "Error de comando de voz",
    voiceControlUnavailable: "Control por voz no disponible",
    voiceCountdownRoundDetail: "Cuenta de voz antes del fin del asalto",
    voiceCountdownRestDetail: "Cuenta de voz antes del fin del descanso",
    voicePrompts: "Indicaciones de voz",
    voicePromptsDetail: "Activar anuncios de asalto y cuentas atras por voz",
    voiceRoundAnnounceDetail: "La voz anuncia el asalto 5 segundos antes de empezar",
    warningSound: "Antes del fin del asalto",
    openSpeechSettings: "Abrir ajustes de voz",
    speechSettingsHint: "Para anadir voces en otros idiomas, instala paquetes de idioma con voz en Windows.",
    showRoundNumber: "Mostrar numero de asalto",
    showRoundNumberDetail: "Mostrar indicador del asalto actual",
    showTotalTime: "Mostrar tiempo total",
    showTotalTimeDetail: "Mostrar tiempo total restante del entrenamiento",
  },
  de: {
    fight: "Kampf!",
    sixEventsCustomFiles: "6 Ereignisse + eigene Dateien",
    auto: "Auto",
    on: "Ein",
    off: "Aus",
    version: "Version",
    add: "+ Hinzufugen",
    alwaysOnTop: "Immer im Vordergrund",
    builtInSounds: "Integrierte Tone",
    buttonColor: "Buttonfarbe",
    buttonHeight: "Buttonhohe",
    buttonText: "Buttontext",
    cardFont: "Kartenschrift",
    colors: "Farben",
    comingSoon: "Kommt bald",
    copyLink: "Link kopieren",
    countUpTimer: "Timer vorwarts zahlen",
    display: "Anzeige",
    fightLabel: "Kampf",
    finishSound: "Ende",
    flexibleTime: "Flexible Zeit",
    flexibleTimeDetail: "Eigene Runden- und Pausenzeiten fur jede Runde festlegen",
    fonts: "Schriften",
    intervalSignalSound: "Intervallsignal",
    keepScreenAwakeDetail: "Bildschirm wahrend des Trainings wach halten",
    layout: "Layout",
    linkCopied: "Link kopiert",
    localProfilesOnly: "Nur lokale Profile",
    microphoneRequired: "Mikrofonberechtigung erforderlich",
    mode: "Modus",
    noSound: "Kein Ton",
    privacy: "Datenschutz",
    profileName: "Profilname",
    requestingMicrophone: "Mikrofon wird angefordert...",
    resetColors: "Farben zurucksetzen",
    resetSettings: "Einstellungen zurucksetzen",
    restStartSound: "Pausenbeginn",
    roundSettings: "Rundeneinstellungen",
    roundStartSound: "Rundenbeginn",
    selectedSound: "Ausgewahlt",
    shareWebsite: "MatClock teilen",
    signalInsideRoundDetail: "Wiederholtes Signal wahrend der Runde. 00:00 deaktiviert es.",
    startButton: "Startbutton",
    systemVoices: "Systemstimmen",
    testVoice: "Stimme testen",
    themeDark: "Dunkel",
    themeLight: "Hell",
    timerAppearanceDetail: "Timer-Darstellung, Farben, Schriften und Layout",
    timerFont: "Timerschrift",
    timerScreenTitle: "Timer-Anzeige",
    topRowHeight: "Hohe der oberen Zeile",
    voiceCommandError: "Fehler bei Sprachbefehl",
    voiceControlUnavailable: "Sprachsteuerung ist nicht verfugbar",
    voiceCountdownRoundDetail: "Sprach-Countdown vor Rundenende",
    voiceCountdownRestDetail: "Sprach-Countdown vor Pausenende",
    voicePrompts: "Sprachhinweise",
    voicePromptsDetail: "Gesprochene Rundenansagen und Countdowns aktivieren",
    voiceRoundAnnounceDetail: "Die Stimme sagt die Runde 5 Sekunden vor dem Start an",
    warningSound: "Vor Rundenende",
    openSpeechSettings: "Spracheinstellungen offnen",
    speechSettingsHint: "Installiere Sprachpakete mit Sprachausgabe in Windows, um Stimmen in weiteren Sprachen hinzuzufugen.",
    showRoundNumber: "Rundennummer anzeigen",
    showRoundNumberDetail: "Anzeige der aktuellen Runde einblenden",
    showTotalTime: "Gesamtzeit anzeigen",
    showTotalTimeDetail: "Verbleibende Gesamtzeit des Trainings anzeigen",
  },
  pl: {
    fight: "Walka!",
    sixEventsCustomFiles: "6 zdarzen + wlasne pliki",
    auto: "Auto",
    announceRoundNumber: "Zapowiadaj numer rundy",
    roundCountdown: "Odliczanie rundy",
    restCountdown: "Odliczanie przerwy",
    voiceControl: "Sterowanie glosem",
    on: "Wl.",
    off: "Wyl.",
    version: "Wersja",
    add: "+ Dodaj",
    alwaysOnTop: "Zawsze na wierzchu",
    builtInSounds: "Wbudowane dzwieki",
    buttonColor: "Kolor przycisku",
    buttonHeight: "Wysokosc przyciskow",
    buttonText: "Tekst przycisku",
    cardFont: "Czcionka kart",
    colors: "Kolory",
    comingSoon: "Wkrotce",
    copyLink: "Kopiuj link",
    countUpTimer: "Liczenie w gore",
    display: "Wyswietlanie",
    fightLabel: "Walka",
    finishSound: "Koniec",
    flexibleTime: "Elastyczny czas",
    flexibleTimeDetail: "Ustaw osobny czas rundy i przerwy dla kazdej rundy",
    fonts: "Czcionki",
    intervalSignalSound: "Sygnal interwalowy",
    keepScreenAwakeDetail: "Nie wygaszaj ekranu podczas treningu",
    layout: "Uklad",
    linkCopied: "Link skopiowany",
    localProfilesOnly: "Tylko profile lokalne",
    microphoneRequired: "Wymagane uprawnienie do mikrofonu",
    mode: "Tryb",
    noSound: "Bez dzwieku",
    privacy: "Prywatnosc",
    profileName: "Nazwa profilu",
    requestingMicrophone: "Prosba o mikrofon...",
    resetColors: "Resetuj kolory",
    resetSettings: "Resetuj ustawienia",
    restStartSound: "Start przerwy",
    roundSettings: "Ustawienia rund",
    roundStartSound: "Start rundy",
    selectedSound: "Wybrano",
    shareWebsite: "Udostepnij MatClock",
    signalInsideRoundDetail: "Powtarzany sygnal w trakcie rundy. Ustaw 00:00, aby wylaczyc.",
    startButton: "Przycisk startu",
    systemVoices: "Glosy systemowe",
    testVoice: "Testuj glos",
    themeDark: "Ciemny",
    themeLight: "Jasny",
    timerAppearanceDetail: "Wyglad timera, kolory, czcionki i uklad",
    timerFont: "Czcionka timera",
    timerScreenTitle: "Ekran timera",
    topRowHeight: "Wysokosc gornego wiersza",
    voiceCommandError: "Blad komendy glosowej",
    voiceControlUnavailable: "Sterowanie glosem jest niedostepne",
    voiceCountdownRoundDetail: "Glosowe odliczanie przed koncem rundy",
    voiceCountdownRestDetail: "Glosowe odliczanie przed koncem przerwy",
    voicePrompts: "Podpowiedzi glosowe",
    voicePromptsDetail: "Wlacz zapowiedzi rund i odliczanie glosem",
    voiceRoundAnnounceDetail: "Glos zapowiada runde 5 sekund przed startem",
    warningSound: "Przed koncem rundy",
    openSpeechSettings: "Otworz ustawienia mowy",
    speechSettingsHint: "Aby dodac glosy w innych jezykach, zainstaluj pakiety jezykowe z obsluga mowy w Windows.",
    showRoundNumber: "Pokaz numer rundy",
    showRoundNumberDetail: "Pokaz wskaznik aktualnej rundy",
    showTotalTime: "Pokaz czas calkowity",
    showTotalTimeDetail: "Pokaz pozostaly calkowity czas treningu",
  },
  fr: {
    fight: "Combat!",
    sixEventsCustomFiles: "6 evenements + fichiers",
    auto: "Auto",
    announceRoundNumber: "Annoncer le numero du round",
    roundCountdown: "Compte a rebours du round",
    restCountdown: "Compte a rebours du repos",
    voiceControl: "Commande vocale",
    on: "Oui",
    off: "Non",
    version: "Version",
    add: "+ Ajouter",
    alwaysOnTop: "Toujours au-dessus",
    builtInSounds: "Sons integres",
    buttonColor: "Couleur du bouton",
    buttonHeight: "Hauteur des boutons",
    buttonText: "Texte du bouton",
    cardFont: "Police des cartes",
    colors: "Couleurs",
    comingSoon: "Bientot",
    copyLink: "Copier le lien",
    countUpTimer: "Compter vers le haut",
    display: "Affichage",
    fightLabel: "Combat",
    finishSound: "Fin",
    flexibleTime: "Temps flexible",
    flexibleTimeDetail: "Definir une duree de round et de repos pour chaque round",
    fonts: "Polices",
    intervalSignalSound: "Signal d'intervalle",
    keepScreenAwakeDetail: "Garder l'ecran allume pendant l'entrainement",
    layout: "Mise en page",
    linkCopied: "Lien copie",
    localProfilesOnly: "Profils locaux uniquement",
    microphoneRequired: "Autorisation du microphone requise",
    mode: "Mode",
    noSound: "Sans son",
    privacy: "Confidentialite",
    profileName: "Nom du profil",
    requestingMicrophone: "Demande du microphone...",
    resetColors: "Reinitialiser les couleurs",
    resetSettings: "Reinitialiser les reglages",
    restStartSound: "Debut du repos",
    roundSettings: "Reglages des rounds",
    roundStartSound: "Debut du round",
    selectedSound: "Selectionne",
    shareWebsite: "Partager MatClock",
    signalInsideRoundDetail: "Signal repete pendant le round. Mettre 00:00 pour desactiver.",
    startButton: "Bouton de demarrage",
    systemVoices: "Voix systeme",
    testVoice: "Tester la voix",
    themeDark: "Sombre",
    themeLight: "Clair",
    timerAppearanceDetail: "Apparence du timer, couleurs, polices et mise en page",
    timerFont: "Police du timer",
    timerScreenTitle: "Ecran du timer",
    topRowHeight: "Hauteur de la ligne superieure",
    voiceCommandError: "Erreur de commande vocale",
    voiceControlUnavailable: "Commande vocale indisponible",
    voiceCountdownRoundDetail: "Compte a rebours vocal avant la fin du round",
    voiceCountdownRestDetail: "Compte a rebours vocal avant la fin du repos",
    voicePrompts: "Indications vocales",
    voicePromptsDetail: "Activer les annonces de rounds et les comptes a rebours vocaux",
    voiceRoundAnnounceDetail: "La voix annonce le round 5 secondes avant le debut",
    warningSound: "Avant la fin du round",
    openSpeechSettings: "Ouvrir les reglages vocaux",
    speechSettingsHint: "Pour ajouter des voix dans d'autres langues, installez des packs de langue avec voix dans Windows.",
    showRoundNumber: "Afficher le numero du round",
    showRoundNumberDetail: "Afficher l'indicateur du round actuel",
    showTotalTime: "Afficher le temps total",
    showTotalTimeDetail: "Afficher le temps total restant de l'entrainement",
  },
  pt: {
    fight: "Lutar!",
    sixEventsCustomFiles: "6 eventos + arquivos",
    auto: "Auto",
    announceRoundNumber: "Anunciar numero do round",
    roundCountdown: "Contagem do round",
    restCountdown: "Contagem do descanso",
    voiceControl: "Controle por voz",
    on: "Ligado",
    off: "Desligado",
    version: "Versao",
    add: "+ Adicionar",
    alwaysOnTop: "Sempre no topo",
    builtInSounds: "Sons integrados",
    buttonColor: "Cor do botao",
    buttonHeight: "Altura dos botoes",
    buttonText: "Texto do botao",
    cardFont: "Fonte dos cartoes",
    colors: "Cores",
    comingSoon: "Em breve",
    copyLink: "Copiar link",
    countUpTimer: "Contagem crescente",
    display: "Exibicao",
    fightLabel: "Luta",
    finishSound: "Final",
    flexibleTime: "Tempo flexivel",
    flexibleTimeDetail: "Defina tempos de round e descanso para cada round",
    fonts: "Fontes",
    intervalSignalSound: "Sinal de intervalo",
    keepScreenAwakeDetail: "Manter a tela ativa durante o treino",
    layout: "Layout",
    linkCopied: "Link copiado",
    localProfilesOnly: "Somente perfis locais",
    microphoneRequired: "Permissao de microfone necessaria",
    mode: "Modo",
    noSound: "Sem som",
    privacy: "Privacidade",
    profileName: "Nome do perfil",
    requestingMicrophone: "Solicitando microfone...",
    resetColors: "Redefinir cores",
    resetSettings: "Redefinir ajustes",
    restStartSound: "Inicio do descanso",
    roundSettings: "Ajustes dos rounds",
    roundStartSound: "Inicio do round",
    selectedSound: "Selecionado",
    shareWebsite: "Compartilhar MatClock",
    signalInsideRoundDetail: "Sinal repetido durante o round. Use 00:00 para desativar.",
    startButton: "Botao de inicio",
    systemVoices: "Vozes do sistema",
    testVoice: "Testar voz",
    themeDark: "Escuro",
    themeLight: "Claro",
    timerAppearanceDetail: "Aparencia do timer, cores, fontes e layout",
    timerFont: "Fonte do timer",
    timerScreenTitle: "Tela do timer",
    topRowHeight: "Altura da linha superior",
    voiceCommandError: "Erro de comando de voz",
    voiceControlUnavailable: "Controle por voz indisponivel",
    voiceCountdownRoundDetail: "Contagem por voz antes do fim do round",
    voiceCountdownRestDetail: "Contagem por voz antes do fim do descanso",
    voicePrompts: "Dicas por voz",
    voicePromptsDetail: "Ativar anuncios de rounds e contagens por voz",
    voiceRoundAnnounceDetail: "A voz anuncia o round 5 segundos antes do inicio",
    warningSound: "Antes do fim do round",
    openSpeechSettings: "Abrir ajustes de fala",
    speechSettingsHint: "Para adicionar vozes em outros idiomas, instale pacotes de idioma com fala no Windows.",
    showRoundNumber: "Mostrar numero do round",
    showRoundNumberDetail: "Mostrar indicador do round atual",
    showTotalTime: "Mostrar tempo total",
    showTotalTimeDetail: "Mostrar o tempo total restante do treino",
  },
  uk: {
    fight: "Бій!",
    maximize: "На весь екран",
    minimize: "Згорнути",
    duplicate: "Дублювати",
    delete: "Видалити",
    createNew: "+ Створити",
    saveProfileChanges: "Зберегти зміни профілю?",
    unsavedProfileChanges: "Часові налаштування цього профілю змінено.",
    prepareTime: "Підготовка",
    roundEndWarning: "Сигнал до кінця раунду",
    signalInsideRound: "Сигнал всередині раунду",
    restEndWarning: "Сигнал до кінця відпочинку",
    flexibleRounds: "Гнучкі раунди",
    enabled: "Увімкнено",
    disabled: "Вимкнено",
    soundSettings: "Налаштування звуку",
    timerScreen: "Екран таймера",
    displayColorsFonts: "Екран, кольори, шрифти",
    sixEventsCustomFiles: "6 подій + власні файли",
    languageVoice: "Мова і голос",
    voice: "Голос",
    auto: "Авто",
    announceRoundNumber: "Називати номер раунду",
    roundCountdown: "Відлік раунду",
    restCountdown: "Відлік відпочинку",
    voiceControl: "Голосове керування",
    on: "Увімк.",
    off: "Вимк.",
    displayBehavior: "Екран і поведінка",
    theme: "Тема",
    preventSleep: "Не вимикати екран",
    about: "Про застосунок",
    website: "Сайт",
    rate: "Оцінити",
    share: "Поділитися",
    contactDevelopers: "Написати розробникам",
    privacyPolicy: "Політика конфіденційності",
    version: "Версія",
    soundSelection: "Вибір звуку",
    add: "+ Додати",
    alwaysOnTop: "Поверх усіх вікон",
    builtInSounds: "Вбудовані звуки",
    buttonColor: "Колір кнопки",
    buttonHeight: "Висота кнопок",
    buttonText: "Текст кнопки",
    cardFont: "Шрифт карток",
    colors: "Кольори",
    comingSoon: "Незабаром",
    copyLink: "Копіювати посилання",
    countUpTimer: "Прямий відлік таймера",
    display: "Відображення",
    fightLabel: "Бій",
    finishSound: "Фініш",
    flexibleTime: "Гнучкий час",
    flexibleTimeDetail: "Задати окремий час раунду і відпочинку для кожного раунду",
    fonts: "Шрифти",
    intervalSignalSound: "Інтервальний сигнал",
    keepScreenAwakeDetail: "Не гасити екран під час тренування",
    layout: "Макет",
    linkCopied: "Посилання скопійовано",
    localProfilesOnly: "Лише локальні профілі",
    microphoneRequired: "Потрібен дозвіл на мікрофон",
    mode: "Режим",
    noSound: "Без звуку",
    privacy: "Конфіденційність",
    profileName: "Назва профілю",
    requestingMicrophone: "Запит мікрофона...",
    resetColors: "Скинути кольори",
    resetSettings: "Скинути налаштування",
    restStartSound: "Початок відпочинку",
    roundSettings: "Налаштування раундів",
    roundStartSound: "Початок раунду",
    selectedSound: "Вибрано",
    shareWebsite: "Поділитися MatClock",
    signalInsideRoundDetail: "Повторний сигнал всередині раунду. 00:00 вимикає його.",
    startButton: "Кнопка старту",
    systemVoices: "Системні голоси",
    testVoice: "Перевірити голос",
    themeDark: "Темна",
    themeLight: "Світла",
    timerAppearanceDetail: "Вигляд таймера, кольори, шрифти і макет",
    timerFont: "Шрифт таймера",
    timerScreenTitle: "Екран таймера",
    topRowHeight: "Висота верхнього рядка",
    voiceCommandError: "Помилка голосової команди",
    voiceControlUnavailable: "Голосове керування недоступне",
    voiceCountdownRoundDetail: "Голосовий відлік до кінця раунду",
    voiceCountdownRestDetail: "Голосовий відлік до кінця відпочинку",
    voicePrompts: "Голосові підказки",
    voicePromptsDetail: "Увімкнути озвучення раундів і відліку",
    voiceRoundAnnounceDetail: "Голос називає раунд за 5 секунд до старту",
    warningSound: "Перед кінцем раунду",
    openSpeechSettings: "Відкрити налаштування мовлення",
    speechSettingsHint: "Щоб додати голоси іншими мовами, встановіть мовні пакети з підтримкою мовлення в Windows.",
    showRoundNumber: "Показувати номер раунду",
    showRoundNumberDetail: "Показувати індикатор поточного раунду",
    showTotalTime: "Показувати загальний час",
    showTotalTimeDetail: "Показувати залишок загального часу тренування",
  },
  it: {
    fight: "Combatti!",
    createNew: "+ Crea nuovo",
    saveProfileChanges: "Salvare le modifiche del profilo?",
    unsavedProfileChanges: "I tempi di questo profilo sono stati modificati.",
    prepareTime: "Tempo preparazione",
    roundEndWarning: "Avviso fine round",
    signalInsideRound: "Segnale durante il round",
    restEndWarning: "Avviso fine riposo",
    flexibleRounds: "Round flessibili",
    enabled: "Attivo",
    disabled: "Disattivo",
    displayColorsFonts: "Schermo, colori, font",
    sixEventsCustomFiles: "6 eventi + file personali",
    voice: "Voce",
    auto: "Auto",
    announceRoundNumber: "Annuncia numero round",
    roundCountdown: "Conto alla rovescia round",
    restCountdown: "Conto alla rovescia riposo",
    voiceControl: "Controllo vocale",
    on: "On",
    off: "Off",
    theme: "Tema",
    preventSleep: "Non spegnere lo schermo",
    about: "Informazioni",
    website: "Sito web",
    rate: "Valuta",
    share: "Condividi",
    contactDevelopers: "Contatta gli sviluppatori",
    privacyPolicy: "Privacy Policy",
    version: "Versione",
    soundSelection: "Selezione suono",
    add: "+ Aggiungi",
    alwaysOnTop: "Sempre in primo piano",
    builtInSounds: "Suoni integrati",
    buttonColor: "Colore pulsante",
    buttonHeight: "Altezza pulsanti",
    buttonText: "Testo pulsante",
    cardFont: "Font schede",
    colors: "Colori",
    comingSoon: "Prossimamente",
    copyLink: "Copia link",
    countUpTimer: "Conteggio crescente",
    display: "Visualizzazione",
    fightLabel: "Combattimento",
    finishSound: "Fine",
    flexibleTime: "Tempo flessibile",
    flexibleTimeDetail: "Imposta durata round e riposo diversa per ogni round",
    fonts: "Font",
    intervalSignalSound: "Segnale intervallo",
    keepScreenAwakeDetail: "Mantieni lo schermo attivo durante l'allenamento",
    layout: "Layout",
    linkCopied: "Link copiato",
    localProfilesOnly: "Solo profili locali",
    microphoneRequired: "Permesso microfono richiesto",
    mode: "Modalita",
    noSound: "Nessun suono",
    privacy: "Privacy",
    profileName: "Nome profilo",
    requestingMicrophone: "Richiesta microfono...",
    resetColors: "Ripristina colori",
    resetSettings: "Ripristina impostazioni",
    restStartSound: "Inizio riposo",
    roundSettings: "Impostazioni round",
    roundStartSound: "Inizio round",
    selectedSound: "Selezionato",
    shareWebsite: "Condividi MatClock",
    signalInsideRoundDetail: "Segnale ripetuto durante il round. Imposta 00:00 per disattivare.",
    startButton: "Pulsante start",
    systemVoices: "Voci di sistema",
    testVoice: "Prova voce",
    themeDark: "Scuro",
    themeLight: "Chiaro",
    timerAppearanceDetail: "Aspetto timer, colori, font e layout",
    timerFont: "Font timer",
    timerScreenTitle: "Schermo timer",
    topRowHeight: "Altezza riga superiore",
    voiceCommandError: "Errore comando vocale",
    voiceControlUnavailable: "Controllo vocale non disponibile",
    voiceCountdownRoundDetail: "Conteggio vocale prima della fine del round",
    voiceCountdownRestDetail: "Conteggio vocale prima della fine del riposo",
    voicePrompts: "Suggerimenti vocali",
    voicePromptsDetail: "Attiva annunci round e conteggi vocali",
    voiceRoundAnnounceDetail: "La voce annuncia il round 5 secondi prima dell'inizio",
    warningSound: "Prima della fine del round",
    openSpeechSettings: "Apri impostazioni voce",
    speechSettingsHint: "Per aggiungere voci in altre lingue, installa i pacchetti lingua con supporto vocale in Windows.",
    showRoundNumber: "Mostra numero round",
    showRoundNumberDetail: "Mostra indicatore del round corrente",
    showTotalTime: "Mostra tempo totale",
    showTotalTimeDetail: "Mostra tempo totale restante dell'allenamento",
  },
  fi: {
    ready: "Valmis",
    paused: "Tauolla",
    finished: "Valmis",
    fight: "Ottelu!",
    maximize: "Koko naytto",
    minimize: "Pienenna",
    done: "Valmis",
    duplicate: "Kopioi",
    delete: "Poista",
    createNew: "+ Luo uusi",
    saveProfileChanges: "Tallennetaanko profiilin muutokset?",
    unsavedProfileChanges: "Taman profiilin aikoja on muutettu.",
    prepareTime: "Valmisteluaika",
    roundEndWarning: "Varoitus eran lopussa",
    signalInsideRound: "Signaali eran aikana",
    restEndWarning: "Varoitus tauon lopussa",
    flexibleRounds: "Joustavat erat",
    enabled: "Kaytossa",
    disabled: "Pois",
    displayColorsFonts: "Naytto, varit, fontit",
    sixEventsCustomFiles: "6 tapahtumaa + omat tiedostot",
    languageVoice: "Kieli ja aani",
    voice: "Aani",
    auto: "Auto",
    announceRoundNumber: "Ilmoita eran numero",
    roundCountdown: "Eran laskenta",
    restCountdown: "Tauon laskenta",
    voiceControl: "Aaniohjaus",
    on: "Paalla",
    off: "Pois",
    displayBehavior: "Naytto ja toiminta",
    theme: "Teema",
    preventSleep: "Pida naytto hereilla",
    about: "Tietoja",
    website: "Verkkosivusto",
    rate: "Arvioi",
    share: "Jaa",
    contactDevelopers: "Ota yhteys kehittajiin",
    privacyPolicy: "Tietosuojakaytanto",
    version: "Versio",
    soundSelection: "Aanen valinta",
    add: "+ Lisaa",
    alwaysOnTop: "Aina paalimmaisena",
    builtInSounds: "Sisaanrakennetut aanet",
    buttonColor: "Painikkeen vari",
    buttonHeight: "Painikkeiden korkeus",
    buttonText: "Painikkeen teksti",
    cardFont: "Korttien fontti",
    colors: "Varit",
    comingSoon: "Tulossa pian",
    copyLink: "Kopioi linkki",
    countUpTimer: "Laske ylospain",
    display: "Naytto",
    fightLabel: "Ottelu",
    finishSound: "Loppu",
    flexibleTime: "Joustava aika",
    flexibleTimeDetail: "Aseta oma eran ja tauon kesto jokaiselle eralle",
    fonts: "Fontit",
    intervalSignalSound: "Intervallisignaali",
    keepScreenAwakeDetail: "Pida naytto hereilla harjoituksen aikana",
    layout: "Asettelu",
    linkCopied: "Linkki kopioitu",
    localProfilesOnly: "Vain paikalliset profiilit",
    microphoneRequired: "Mikrofonin lupa vaaditaan",
    mode: "Tila",
    noSound: "Ei aanta",
    privacy: "Tietosuoja",
    profileName: "Profiilin nimi",
    requestingMicrophone: "Pyydetaan mikrofonia...",
    resetColors: "Nollaa varit",
    resetSettings: "Nollaa asetukset",
    restStartSound: "Tauon alku",
    roundSettings: "Era-asetukset",
    roundStartSound: "Eran alku",
    selectedSound: "Valittu",
    shareWebsite: "Jaa MatClock",
    signalInsideRoundDetail: "Toistuva signaali eran aikana. Aseta 00:00 poistaaksesi kaytosta.",
    startButton: "Aloituspainike",
    systemVoices: "Jarjestelmaaanet",
    testVoice: "Testaa aani",
    themeDark: "Tumma",
    themeLight: "Vaalea",
    timerAppearanceDetail: "Ajastimen ulkoasu, varit, fontit ja asettelu",
    timerFont: "Ajastimen fontti",
    timerScreenTitle: "Ajastimen naytto",
    topRowHeight: "Ylarivin korkeus",
    voiceCommandError: "Aanikomennon virhe",
    voiceControlUnavailable: "Aaniohjaus ei ole saatavilla",
    voiceCountdownRoundDetail: "Aanilaskenta ennen eran loppua",
    voiceCountdownRestDetail: "Aanilaskenta ennen tauon loppua",
    voicePrompts: "Aanikehotteet",
    voicePromptsDetail: "Ota eran ilmoitukset ja laskennat kayttoon",
    voiceRoundAnnounceDetail: "Aani ilmoittaa eran 5 sekuntia ennen alkua",
    warningSound: "Ennen eran loppua",
    openSpeechSettings: "Avaa puheasetukset",
    speechSettingsHint: "Lisaaksesi aania muilla kielilla asenna Windowsin puhetta tukevat kielipaketit.",
    showRoundNumber: "Nayta eran numero",
    showRoundNumberDetail: "Nayta nykyisen eran ilmaisin",
    showTotalTime: "Nayta kokonaisaika",
    showTotalTimeDetail: "Nayta harjoituksen jaljella oleva kokonaisaika",
  },
  bs: {
    ready: "Spremno",
    paused: "Pauzirano",
    finished: "Zavrseno",
    fight: "Borba!",
    maximize: "Cijeli ekran",
    minimize: "Smanji",
    done: "Gotovo",
    duplicate: "Dupliciraj",
    delete: "Obrisi",
    createNew: "+ Kreiraj novi",
    saveProfileChanges: "Spremiti promjene profila?",
    unsavedProfileChanges: "Vremena za ovaj profil su promijenjena.",
    prepareTime: "Vrijeme pripreme",
    roundEndWarning: "Upozorenje prije kraja runde",
    signalInsideRound: "Signal tokom runde",
    restEndWarning: "Upozorenje prije kraja odmora",
    flexibleRounds: "Fleksibilne runde",
    enabled: "Ukljuceno",
    disabled: "Iskljuceno",
    soundSettings: "Postavke zvuka",
    timerScreen: "Ekran tajmera",
    displayColorsFonts: "Ekran, boje, fontovi",
    sixEventsCustomFiles: "6 dogadaja + vlastite datoteke",
    languageVoice: "Jezik i glas",
    voice: "Glas",
    auto: "Auto",
    announceRoundNumber: "Najavi broj runde",
    roundCountdown: "Odbrojavanje runde",
    restCountdown: "Odbrojavanje odmora",
    voiceControl: "Glasovna kontrola",
    on: "Uklj.",
    off: "Isklj.",
    displayBehavior: "Ekran i ponasanje",
    theme: "Tema",
    preventSleep: "Ne gasiti ekran",
    about: "O aplikaciji",
    website: "Web-stranica",
    rate: "Ocijeni",
    share: "Podijeli",
    contactDevelopers: "Kontaktiraj developere",
    privacyPolicy: "Politika privatnosti",
    version: "Verzija",
    soundSelection: "Izbor zvuka",
    add: "+ Dodaj",
    alwaysOnTop: "Uvijek iznad",
    builtInSounds: "Ugradeni zvukovi",
    buttonColor: "Boja dugmeta",
    buttonHeight: "Visina dugmadi",
    buttonText: "Tekst dugmeta",
    cardFont: "Font kartica",
    colors: "Boje",
    comingSoon: "Uskoro",
    copyLink: "Kopiraj link",
    countUpTimer: "Broji unaprijed",
    display: "Prikaz",
    fightLabel: "Borba",
    finishSound: "Kraj",
    flexibleTime: "Fleksibilno vrijeme",
    flexibleTimeDetail: "Postavi posebno trajanje runde i odmora za svaku rundu",
    fonts: "Fontovi",
    intervalSignalSound: "Intervalni signal",
    keepScreenAwakeDetail: "Drzi ekran ukljucen tokom treninga",
    layout: "Raspored",
    linkCopied: "Link kopiran",
    localProfilesOnly: "Samo lokalni profili",
    microphoneRequired: "Potrebna je dozvola za mikrofon",
    mode: "Rezim",
    noSound: "Bez zvuka",
    privacy: "Privatnost",
    profileName: "Naziv profila",
    requestingMicrophone: "Trazim mikrofon...",
    resetColors: "Resetuj boje",
    resetSettings: "Resetuj postavke",
    restStartSound: "Pocetak odmora",
    roundSettings: "Postavke rundi",
    roundStartSound: "Pocetak runde",
    selectedSound: "Izabrano",
    shareWebsite: "Podijeli MatClock",
    signalInsideRoundDetail: "Ponavljajuci signal tokom runde. Postavi 00:00 za iskljucenje.",
    startButton: "Start dugme",
    systemVoices: "Sistemski glasovi",
    testVoice: "Testiraj glas",
    themeDark: "Tamna",
    themeLight: "Svijetla",
    timerAppearanceDetail: "Izgled tajmera, boje, fontovi i raspored",
    timerFont: "Font tajmera",
    timerScreenTitle: "Ekran tajmera",
    topRowHeight: "Visina gornjeg reda",
    voiceCommandError: "Greska glasovne komande",
    voiceControlUnavailable: "Glasovna kontrola nije dostupna",
    voiceCountdownRoundDetail: "Glasovno odbrojavanje prije kraja runde",
    voiceCountdownRestDetail: "Glasovno odbrojavanje prije kraja odmora",
    voicePrompts: "Glasovne upute",
    voicePromptsDetail: "Ukljuci glasovne najave rundi i odbrojavanja",
    voiceRoundAnnounceDetail: "Glas najavljuje rundu 5 sekundi prije starta",
    warningSound: "Prije kraja runde",
    openSpeechSettings: "Otvori postavke govora",
    speechSettingsHint: "Za dodavanje glasova na drugim jezicima instaliraj Windows jezicke pakete s podrskom za govor.",
    showRoundNumber: "Prikazi broj runde",
    showRoundNumberDetail: "Prikazi indikator trenutne runde",
    showTotalTime: "Prikazi ukupno vrijeme",
    showTotalTimeDetail: "Prikazi preostalo ukupno vrijeme treninga",
  },
  vi: {
    ready: "San sang",
    paused: "Tam dung",
    finished: "Da xong",
    fight: "Bat dau!",
    maximize: "Toan man hinh",
    minimize: "Thu nho",
    done: "Xong",
    duplicate: "Nhan ban",
    delete: "Xoa",
    createNew: "+ Tao moi",
    saveProfileChanges: "Luu thay doi ho so?",
    unsavedProfileChanges: "Thoi gian cua ho so nay da thay doi.",
    prepareTime: "Thoi gian chuan bi",
    roundEndWarning: "Canh bao het hiep",
    signalInsideRound: "Tin hieu trong hiep",
    restEndWarning: "Canh bao het nghi",
    flexibleRounds: "Hiep linh hoat",
    enabled: "Bat",
    disabled: "Tat",
    soundSettings: "Cai dat am thanh",
    timerScreen: "Man hinh dong ho",
    displayColorsFonts: "Man hinh, mau, phong chu",
    sixEventsCustomFiles: "6 su kien + tep rieng",
    languageVoice: "Ngon ngu va giong noi",
    voice: "Giong noi",
    auto: "Tu dong",
    announceRoundNumber: "Doc so hiep",
    roundCountdown: "Dem nguoc hiep",
    restCountdown: "Dem nguoc nghi",
    voiceControl: "Dieu khien bang giong noi",
    on: "Bat",
    off: "Tat",
    displayBehavior: "Man hinh va hanh vi",
    theme: "Chu de",
    preventSleep: "Khong tat man hinh",
    about: "Gioi thieu",
    website: "Trang web",
    rate: "Danh gia",
    share: "Chia se",
    contactDevelopers: "Lien he nha phat trien",
    privacyPolicy: "Chinh sach bao mat",
    version: "Phien ban",
    soundSelection: "Chon am thanh",
    add: "+ Them",
    alwaysOnTop: "Luon o tren",
    builtInSounds: "Am thanh co san",
    buttonColor: "Mau nut",
    buttonHeight: "Chieu cao nut",
    buttonText: "Chu tren nut",
    cardFont: "Phong chu the",
    colors: "Mau sac",
    comingSoon: "Sap co",
    copyLink: "Sao chep lien ket",
    countUpTimer: "Dem tien",
    display: "Hien thi",
    fightLabel: "Dau",
    finishSound: "Ket thuc",
    flexibleTime: "Thoi gian linh hoat",
    flexibleTimeDetail: "Dat thoi gian hiep va nghi rieng cho tung hiep",
    fonts: "Phong chu",
    intervalSignalSound: "Tin hieu dinh ky",
    keepScreenAwakeDetail: "Giu man hinh sang trong khi tap",
    layout: "Bo cuc",
    linkCopied: "Da sao chep lien ket",
    localProfilesOnly: "Chi ho so cuc bo",
    microphoneRequired: "Can quyen micro",
    mode: "Che do",
    noSound: "Khong am thanh",
    privacy: "Bao mat",
    profileName: "Ten ho so",
    requestingMicrophone: "Dang xin quyen micro...",
    resetColors: "Dat lai mau",
    resetSettings: "Dat lai cai dat",
    restStartSound: "Bat dau nghi",
    roundSettings: "Cai dat hiep",
    roundStartSound: "Bat dau hiep",
    selectedSound: "Da chon",
    shareWebsite: "Chia se MatClock",
    signalInsideRoundDetail: "Tin hieu lap lai trong hiep. Dat 00:00 de tat.",
    startButton: "Nut bat dau",
    systemVoices: "Giong noi he thong",
    testVoice: "Thu giong noi",
    themeDark: "Toi",
    themeLight: "Sang",
    timerAppearanceDetail: "Giao dien dong ho, mau, phong chu va bo cuc",
    timerFont: "Phong chu dong ho",
    timerScreenTitle: "Man hinh dong ho",
    topRowHeight: "Chieu cao hang tren",
    voiceCommandError: "Loi lenh giong noi",
    voiceControlUnavailable: "Dieu khien giong noi khong kha dung",
    voiceCountdownRoundDetail: "Dem nguoc bang giong noi truoc khi het hiep",
    voiceCountdownRestDetail: "Dem nguoc bang giong noi truoc khi het nghi",
    voicePrompts: "Nhac bang giong noi",
    voicePromptsDetail: "Bat thong bao hiep va dem nguoc bang giong noi",
    voiceRoundAnnounceDetail: "Giong noi doc hiep 5 giay truoc khi bat dau",
    warningSound: "Truoc khi het hiep",
    openSpeechSettings: "Mo cai dat giong noi",
    speechSettingsHint: "De them giong noi ngon ngu khac, hay cai goi ngon ngu co ho tro giong noi trong Windows.",
    showRoundNumber: "Hien so hiep",
    showRoundNumberDetail: "Hien chi bao hiep hien tai",
    showTotalTime: "Hien tong thoi gian",
    showTotalTimeDetail: "Hien tong thoi gian tap con lai",
  },
  "zh-Hans": {
    fight: "开始!",
    createNew: "+ 新建",
    saveProfileChanges: "保存配置更改?",
    unsavedProfileChanges: "此配置的时间设置已更改。",
    prepareTime: "准备时间",
    roundEndWarning: "回合结束提醒",
    signalInsideRound: "回合内信号",
    restEndWarning: "休息结束提醒",
    flexibleRounds: "灵活回合",
    enabled: "已启用",
    disabled: "已关闭",
    displayColorsFonts: "显示、颜色、字体",
    sixEventsCustomFiles: "6 个事件 + 自定义文件",
    languageVoice: "语言和语音",
    voice: "语音",
    auto: "自动",
    announceRoundNumber: "播报回合编号",
    roundCountdown: "回合倒计时",
    restCountdown: "休息倒计时",
    voiceControl: "语音控制",
    on: "开",
    off: "关",
    displayBehavior: "显示和行为",
    theme: "主题",
    preventSleep: "防止屏幕休眠",
    about: "关于",
    website: "网站",
    rate: "评分",
    share: "分享",
    contactDevelopers: "联系开发者",
    privacyPolicy: "隐私政策",
    version: "版本",
    soundSelection: "声音选择",
    add: "+ 添加",
    alwaysOnTop: "窗口置顶",
    builtInSounds: "内置声音",
    buttonColor: "按钮颜色",
    buttonHeight: "按钮高度",
    buttonText: "按钮文字",
    cardFont: "卡片字体",
    colors: "颜色",
    comingSoon: "即将推出",
    copyLink: "复制链接",
    countUpTimer: "正向计时",
    display: "显示",
    fightLabel: "比赛",
    finishSound: "结束",
    flexibleTime: "灵活时间",
    flexibleTimeDetail: "为每个回合设置不同的回合和休息时间",
    fonts: "字体",
    intervalSignalSound: "间隔信号",
    keepScreenAwakeDetail: "训练时保持屏幕唤醒",
    layout: "布局",
    linkCopied: "链接已复制",
    localProfilesOnly: "仅本地配置",
    microphoneRequired: "需要麦克风权限",
    mode: "模式",
    noSound: "无声音",
    privacy: "隐私",
    profileName: "配置名称",
    requestingMicrophone: "正在请求麦克风...",
    resetColors: "重置颜色",
    resetSettings: "重置设置",
    restStartSound: "休息开始",
    roundSettings: "回合设置",
    roundStartSound: "回合开始",
    selectedSound: "已选择",
    shareWebsite: "分享 MatClock",
    signalInsideRoundDetail: "回合内重复信号。设置为 00:00 可关闭。",
    startButton: "开始按钮",
    systemVoices: "系统语音",
    testVoice: "测试语音",
    themeDark: "深色",
    themeLight: "浅色",
    timerAppearanceDetail: "计时器外观、颜色、字体和布局",
    timerFont: "计时器字体",
    timerScreenTitle: "计时器屏幕",
    topRowHeight: "顶部行高度",
    voiceCommandError: "语音命令错误",
    voiceControlUnavailable: "语音控制不可用",
    voiceCountdownRoundDetail: "回合结束前语音倒计时",
    voiceCountdownRestDetail: "休息结束前语音倒计时",
    voicePrompts: "语音提示",
    voicePromptsDetail: "启用回合播报和语音倒计时",
    voiceRoundAnnounceDetail: "语音在开始前 5 秒播报回合",
    warningSound: "回合结束前",
    openSpeechSettings: "打开语音设置",
    speechSettingsHint: "要添加其他语言的语音，请在 Windows 设置中安装支持语音的语言包。",
    showRoundNumber: "显示回合编号",
    showRoundNumberDetail: "显示当前回合指示器",
    showTotalTime: "显示总时间",
    showTotalTimeDetail: "显示训练剩余总时间",
  },
  "zh-Hant": {
    ready: "就緒",
    fight: "開始!",
    done: "完成",
    duplicate: "複製",
    delete: "刪除",
    createNew: "+ 新增",
    saveProfileChanges: "儲存設定檔變更?",
    unsavedProfileChanges: "此設定檔的時間設定已變更。",
    prepareTime: "準備時間",
    roundEndWarning: "回合結束提醒",
    signalInsideRound: "回合內訊號",
    restEndWarning: "休息結束提醒",
    flexibleRounds: "彈性回合",
    enabled: "已啟用",
    disabled: "已停用",
    soundSettings: "聲音設定",
    timerScreen: "計時器畫面",
    displayColorsFonts: "畫面、顏色、字型",
    sixEventsCustomFiles: "6 個事件 + 自訂檔案",
    languageVoice: "語言與語音",
    voice: "語音",
    auto: "自動",
    announceRoundNumber: "播報回合編號",
    roundCountdown: "回合倒數",
    restCountdown: "休息倒數",
    voiceControl: "語音控制",
    on: "開",
    off: "關",
    displayBehavior: "畫面與行為",
    theme: "主題",
    preventSleep: "防止螢幕休眠",
    about: "關於",
    website: "網站",
    rate: "評分",
    share: "分享",
    contactDevelopers: "聯絡開發者",
    privacyPolicy: "隱私權政策",
    version: "版本",
    soundSelection: "聲音選擇",
    add: "+ 新增",
    alwaysOnTop: "永遠置頂",
    builtInSounds: "內建聲音",
    buttonColor: "按鈕顏色",
    buttonHeight: "按鈕高度",
    buttonText: "按鈕文字",
    cardFont: "卡片字型",
    colors: "顏色",
    comingSoon: "即將推出",
    copyLink: "複製連結",
    countUpTimer: "正向計時",
    display: "顯示",
    fightLabel: "比賽",
    finishSound: "結束",
    flexibleTime: "彈性時間",
    flexibleTimeDetail: "為每個回合設定不同的回合與休息時間",
    fonts: "字型",
    intervalSignalSound: "間隔訊號",
    keepScreenAwakeDetail: "訓練時保持螢幕喚醒",
    layout: "版面",
    linkCopied: "連結已複製",
    localProfilesOnly: "僅本機設定檔",
    microphoneRequired: "需要麥克風權限",
    mode: "模式",
    noSound: "無聲音",
    privacy: "隱私",
    profileName: "設定檔名稱",
    requestingMicrophone: "正在要求麥克風...",
    resetColors: "重設顏色",
    resetSettings: "重設設定",
    restStartSound: "休息開始",
    roundSettings: "回合設定",
    roundStartSound: "回合開始",
    selectedSound: "已選擇",
    shareWebsite: "分享 MatClock",
    signalInsideRoundDetail: "回合內重複訊號。設為 00:00 可停用。",
    startButton: "開始按鈕",
    systemVoices: "系統語音",
    testVoice: "測試語音",
    themeDark: "深色",
    themeLight: "淺色",
    timerAppearanceDetail: "計時器外觀、顏色、字型與版面",
    timerFont: "計時器字型",
    timerScreenTitle: "計時器畫面",
    topRowHeight: "頂部列高度",
    voiceCommandError: "語音命令錯誤",
    voiceControlUnavailable: "語音控制無法使用",
    voiceCountdownRoundDetail: "回合結束前語音倒數",
    voiceCountdownRestDetail: "休息結束前語音倒數",
    voicePrompts: "語音提示",
    voicePromptsDetail: "啟用回合播報與語音倒數",
    voiceRoundAnnounceDetail: "語音會在開始前 5 秒播報回合",
    warningSound: "回合結束前",
    openSpeechSettings: "開啟語音設定",
    speechSettingsHint: "若要新增其他語言的語音，請在 Windows 設定中安裝支援語音的語言套件。",
    showRoundNumber: "顯示回合編號",
    showRoundNumberDetail: "顯示目前回合指示器",
    showTotalTime: "顯示總時間",
    showTotalTimeDetail: "顯示訓練剩餘總時間",
  },
  th: {
    ready: "พร้อม",
    paused: "หยุดชั่วคราว",
    finished: "เสร็จสิ้น",
    fight: "เริ่ม!",
    maximize: "เต็มหน้าจอ",
    minimize: "ย่อหน้าจอ",
    done: "เสร็จ",
    duplicate: "ทำสำเนา",
    delete: "ลบ",
    createNew: "+ สร้างใหม่",
    saveProfileChanges: "บันทึกการเปลี่ยนแปลงโปรไฟล์?",
    unsavedProfileChanges: "เวลาของโปรไฟล์นี้ถูกเปลี่ยนแล้ว",
    prepareTime: "เวลาเตรียม",
    roundEndWarning: "เตือนก่อนจบยก",
    signalInsideRound: "สัญญาณระหว่างยก",
    restEndWarning: "เตือนก่อนจบพัก",
    flexibleRounds: "ยกแบบยืดหยุ่น",
    enabled: "เปิด",
    disabled: "ปิด",
    soundSettings: "ตั้งค่าเสียง",
    timerScreen: "หน้าจอตัวจับเวลา",
    displayColorsFonts: "หน้าจอ สี ฟอนต์",
    sixEventsCustomFiles: "6 เหตุการณ์ + ไฟล์เอง",
    languageVoice: "ภาษาและเสียง",
    voice: "เสียงพูด",
    auto: "อัตโนมัติ",
    announceRoundNumber: "ประกาศหมายเลขยก",
    roundCountdown: "นับถอยหลังยก",
    restCountdown: "นับถอยหลังพัก",
    voiceControl: "ควบคุมด้วยเสียง",
    on: "เปิด",
    off: "ปิด",
    displayBehavior: "หน้าจอและการทำงาน",
    theme: "ธีม",
    preventSleep: "ไม่ให้หน้าจอดับ",
    about: "เกี่ยวกับ",
    website: "เว็บไซต์",
    rate: "ให้คะแนน",
    share: "แชร์",
    contactDevelopers: "ติดต่อผู้พัฒนา",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    version: "เวอร์ชัน",
    soundSelection: "เลือกเสียง",
    add: "+ เพิ่ม",
    alwaysOnTop: "อยู่ด้านบนเสมอ",
    builtInSounds: "เสียงในตัว",
    buttonColor: "สีปุ่ม",
    buttonHeight: "ความสูงปุ่ม",
    buttonText: "ข้อความปุ่ม",
    cardFont: "ฟอนต์การ์ด",
    colors: "สี",
    comingSoon: "เร็วๆ นี้",
    copyLink: "คัดลอกลิงก์",
    countUpTimer: "นับเวลาเพิ่ม",
    display: "การแสดงผล",
    fightLabel: "ชก",
    finishSound: "จบ",
    flexibleTime: "เวลายืดหยุ่น",
    flexibleTimeDetail: "ตั้งเวลาแต่ละยกและเวลาพักแยกกัน",
    fonts: "ฟอนต์",
    intervalSignalSound: "สัญญาณช่วงเวลา",
    keepScreenAwakeDetail: "เปิดหน้าจอไว้ระหว่างการฝึก",
    layout: "เลย์เอาต์",
    linkCopied: "คัดลอกลิงก์แล้ว",
    localProfilesOnly: "โปรไฟล์ในเครื่องเท่านั้น",
    microphoneRequired: "ต้องอนุญาตไมโครโฟน",
    mode: "โหมด",
    noSound: "ไม่มีเสียง",
    privacy: "ความเป็นส่วนตัว",
    profileName: "ชื่อโปรไฟล์",
    requestingMicrophone: "กำลังขอใช้ไมโครโฟน...",
    resetColors: "รีเซ็ตสี",
    resetSettings: "รีเซ็ตการตั้งค่า",
    restStartSound: "เริ่มพัก",
    roundSettings: "ตั้งค่ายก",
    roundStartSound: "เริ่มยก",
    selectedSound: "เลือกแล้ว",
    shareWebsite: "แชร์ MatClock",
    signalInsideRoundDetail: "สัญญาณซ้ำระหว่างยก ตั้ง 00:00 เพื่อปิด",
    startButton: "ปุ่มเริ่ม",
    systemVoices: "เสียงระบบ",
    testVoice: "ทดสอบเสียง",
    themeDark: "มืด",
    themeLight: "สว่าง",
    timerAppearanceDetail: "รูปลักษณ์ตัวจับเวลา สี ฟอนต์ และเลย์เอาต์",
    timerFont: "ฟอนต์ตัวจับเวลา",
    timerScreenTitle: "หน้าจอตัวจับเวลา",
    topRowHeight: "ความสูงแถวบน",
    voiceCommandError: "ข้อผิดพลาดคำสั่งเสียง",
    voiceControlUnavailable: "ไม่สามารถใช้การควบคุมด้วยเสียง",
    voiceCountdownRoundDetail: "เสียงนับถอยหลังก่อนจบยก",
    voiceCountdownRestDetail: "เสียงนับถอยหลังก่อนจบพัก",
    voicePrompts: "เสียงแจ้งเตือน",
    voicePromptsDetail: "เปิดการประกาศยกและนับถอยหลังด้วยเสียง",
    voiceRoundAnnounceDetail: "เสียงจะประกาศยกก่อนเริ่ม 5 วินาที",
    warningSound: "ก่อนจบยก",
    openSpeechSettings: "เปิดตั้งค่าเสียงพูด",
    speechSettingsHint: "หากต้องการเพิ่มเสียงภาษาอื่น ให้ติดตั้งแพ็กภาษา Windows ที่รองรับเสียงพูด",
    showRoundNumber: "แสดงหมายเลขยก",
    showRoundNumberDetail: "แสดงตัวบอกยกปัจจุบัน",
    showTotalTime: "แสดงเวลารวม",
    showTotalTimeDetail: "แสดงเวลารวมที่เหลือของการฝึก",
  },
  ar: {
    ready: "جاهز",
    paused: "متوقف مؤقتا",
    finished: "انتهى",
    fight: "ابدأ!",
    maximize: "ملء الشاشة",
    minimize: "تصغير",
    done: "تم",
    duplicate: "نسخ",
    delete: "حذف",
    createNew: "+ إنشاء جديد",
    saveProfileChanges: "حفظ تغييرات الملف؟",
    unsavedProfileChanges: "تم تغيير إعدادات الوقت لهذا الملف.",
    prepareTime: "وقت التحضير",
    roundEndWarning: "تنبيه نهاية الجولة",
    signalInsideRound: "إشارة داخل الجولة",
    restEndWarning: "تنبيه نهاية الراحة",
    flexibleRounds: "جولات مرنة",
    enabled: "مفعل",
    disabled: "معطل",
    soundSettings: "إعدادات الصوت",
    timerScreen: "شاشة المؤقت",
    displayColorsFonts: "الشاشة والألوان والخطوط",
    sixEventsCustomFiles: "6 أحداث + ملفاتك",
    languageVoice: "اللغة والصوت",
    voice: "الصوت",
    auto: "تلقائي",
    announceRoundNumber: "إعلان رقم الجولة",
    roundCountdown: "عد تنازلي للجولة",
    restCountdown: "عد تنازلي للراحة",
    voiceControl: "تحكم صوتي",
    on: "تشغيل",
    off: "إيقاف",
    displayBehavior: "الشاشة والسلوك",
    theme: "السمة",
    preventSleep: "منع إطفاء الشاشة",
    about: "حول التطبيق",
    website: "الموقع",
    rate: "تقييم",
    share: "مشاركة",
    contactDevelopers: "اتصل بالمطورين",
    privacyPolicy: "سياسة الخصوصية",
    version: "الإصدار",
    soundSelection: "اختيار الصوت",
    add: "+ إضافة",
    alwaysOnTop: "دائما في الأعلى",
    builtInSounds: "أصوات مدمجة",
    buttonColor: "لون الزر",
    buttonHeight: "ارتفاع الأزرار",
    buttonText: "نص الزر",
    cardFont: "خط البطاقات",
    colors: "الألوان",
    comingSoon: "قريبا",
    copyLink: "نسخ الرابط",
    countUpTimer: "عد تصاعدي",
    display: "العرض",
    fightLabel: "قتال",
    finishSound: "النهاية",
    flexibleTime: "وقت مرن",
    flexibleTimeDetail: "عيّن مدة جولة وراحة مختلفة لكل جولة",
    fonts: "الخطوط",
    intervalSignalSound: "إشارة الفاصل",
    keepScreenAwakeDetail: "إبقاء الشاشة نشطة أثناء التدريب",
    layout: "التخطيط",
    linkCopied: "تم نسخ الرابط",
    localProfilesOnly: "ملفات محلية فقط",
    microphoneRequired: "مطلوب إذن الميكروفون",
    mode: "الوضع",
    noSound: "بدون صوت",
    privacy: "الخصوصية",
    profileName: "اسم الملف",
    requestingMicrophone: "جار طلب الميكروفون...",
    resetColors: "إعادة ضبط الألوان",
    resetSettings: "إعادة ضبط الإعدادات",
    restStartSound: "بداية الراحة",
    roundSettings: "إعدادات الجولات",
    roundStartSound: "بداية الجولة",
    selectedSound: "محدد",
    shareWebsite: "مشاركة MatClock",
    signalInsideRoundDetail: "إشارة متكررة أثناء الجولة. اضبط 00:00 للتعطيل.",
    startButton: "زر البدء",
    systemVoices: "أصوات النظام",
    testVoice: "اختبار الصوت",
    themeDark: "داكن",
    themeLight: "فاتح",
    timerAppearanceDetail: "مظهر المؤقت والألوان والخطوط والتخطيط",
    timerFont: "خط المؤقت",
    timerScreenTitle: "شاشة المؤقت",
    topRowHeight: "ارتفاع الصف العلوي",
    voiceCommandError: "خطأ أمر صوتي",
    voiceControlUnavailable: "التحكم الصوتي غير متاح",
    voiceCountdownRoundDetail: "عد صوتي قبل نهاية الجولة",
    voiceCountdownRestDetail: "عد صوتي قبل نهاية الراحة",
    voicePrompts: "تنبيهات صوتية",
    voicePromptsDetail: "تفعيل إعلان الجولات والعد التنازلي بالصوت",
    voiceRoundAnnounceDetail: "يعلن الصوت الجولة قبل البدء بخمس ثوان",
    warningSound: "قبل نهاية الجولة",
    openSpeechSettings: "فتح إعدادات الكلام",
    speechSettingsHint: "لإضافة أصوات بلغات أخرى، ثبّت حزم اللغة التي تدعم الكلام في إعدادات Windows.",
    showRoundNumber: "إظهار رقم الجولة",
    showRoundNumberDetail: "إظهار مؤشر الجولة الحالية",
    showTotalTime: "إظهار الوقت الكلي",
    showTotalTimeDetail: "إظهار الوقت الكلي المتبقي للتدريب",
  },
  hi: {
    ready: "तैयार",
    paused: "विराम",
    finished: "समाप्त",
    fight: "शुरू!",
    maximize: "पूर्ण स्क्रीन",
    minimize: "छोटा करें",
    done: "हो गया",
    duplicate: "डुप्लिकेट",
    delete: "हटाएं",
    createNew: "+ नया बनाएं",
    saveProfileChanges: "प्रोफाइल बदलाव सेव करें?",
    unsavedProfileChanges: "इस प्रोफाइल की समय सेटिंग बदल गई है।",
    prepareTime: "तैयारी समय",
    roundEndWarning: "राउंड अंत चेतावनी",
    signalInsideRound: "राउंड के अंदर संकेत",
    restEndWarning: "आराम अंत चेतावनी",
    flexibleRounds: "लचीले राउंड",
    enabled: "चालू",
    disabled: "बंद",
    soundSettings: "ध्वनि सेटिंग",
    timerScreen: "टाइमर स्क्रीन",
    displayColorsFonts: "स्क्रीन, रंग, फॉन्ट",
    sixEventsCustomFiles: "6 इवेंट + अपनी फाइलें",
    languageVoice: "भाषा और आवाज",
    voice: "आवाज",
    auto: "ऑटो",
    announceRoundNumber: "राउंड नंबर बोलें",
    roundCountdown: "राउंड काउंटडाउन",
    restCountdown: "आराम काउंटडाउन",
    voiceControl: "आवाज नियंत्रण",
    on: "चालू",
    off: "बंद",
    displayBehavior: "स्क्रीन और व्यवहार",
    theme: "थीम",
    preventSleep: "स्क्रीन बंद न होने दें",
    about: "ऐप के बारे में",
    website: "वेबसाइट",
    rate: "रेट करें",
    share: "शेयर",
    contactDevelopers: "डेवलपर से संपर्क",
    privacyPolicy: "गोपनीयता नीति",
    version: "संस्करण",
    soundSelection: "ध्वनि चयन",
    add: "+ जोड़ें",
    alwaysOnTop: "हमेशा ऊपर",
    builtInSounds: "अंतर्निहित ध्वनियां",
    buttonColor: "बटन रंग",
    buttonHeight: "बटन ऊंचाई",
    buttonText: "बटन टेक्स्ट",
    cardFont: "कार्ड फॉन्ट",
    colors: "रंग",
    comingSoon: "जल्द आ रहा है",
    copyLink: "लिंक कॉपी करें",
    countUpTimer: "आगे गिनें",
    display: "डिस्प्ले",
    fightLabel: "फाइट",
    finishSound: "समाप्ति",
    flexibleTime: "लचीला समय",
    flexibleTimeDetail: "हर राउंड के लिए अलग राउंड और आराम समय सेट करें",
    fonts: "फॉन्ट",
    intervalSignalSound: "अंतराल संकेत",
    keepScreenAwakeDetail: "ट्रेनिंग के दौरान स्क्रीन चालू रखें",
    layout: "लेआउट",
    linkCopied: "लिंक कॉपी हो गया",
    localProfilesOnly: "केवल स्थानीय प्रोफाइल",
    microphoneRequired: "माइक्रोफोन अनुमति जरूरी है",
    mode: "मोड",
    noSound: "ध्वनि नहीं",
    privacy: "गोपनीयता",
    profileName: "प्रोफाइल नाम",
    requestingMicrophone: "माइक्रोफोन मांगा जा रहा है...",
    resetColors: "रंग रीसेट करें",
    resetSettings: "सेटिंग रीसेट करें",
    restStartSound: "आराम शुरू",
    roundSettings: "राउंड सेटिंग",
    roundStartSound: "राउंड शुरू",
    selectedSound: "चयनित",
    shareWebsite: "MatClock शेयर करें",
    signalInsideRoundDetail: "राउंड के दौरान दोहराया संकेत। बंद करने के लिए 00:00 सेट करें।",
    startButton: "स्टार्ट बटन",
    systemVoices: "सिस्टम आवाजें",
    testVoice: "आवाज जांचें",
    themeDark: "डार्क",
    themeLight: "लाइट",
    timerAppearanceDetail: "टाइमर रूप, रंग, फॉन्ट और लेआउट",
    timerFont: "टाइमर फॉन्ट",
    timerScreenTitle: "टाइमर स्क्रीन",
    topRowHeight: "ऊपरी पंक्ति ऊंचाई",
    voiceCommandError: "आवाज कमांड त्रुटि",
    voiceControlUnavailable: "आवाज नियंत्रण उपलब्ध नहीं",
    voiceCountdownRoundDetail: "राउंड खत्म होने से पहले आवाज काउंटडाउन",
    voiceCountdownRestDetail: "आराम खत्म होने से पहले आवाज काउंटडाउन",
    voicePrompts: "आवाज संकेत",
    voicePromptsDetail: "राउंड घोषणा और आवाज काउंटडाउन चालू करें",
    voiceRoundAnnounceDetail: "आवाज शुरू होने से 5 सेकंड पहले राउंड बोलती है",
    warningSound: "राउंड खत्म होने से पहले",
    openSpeechSettings: "स्पीच सेटिंग खोलें",
    speechSettingsHint: "अन्य भाषाओं की आवाजें जोड़ने के लिए Windows सेटिंग में स्पीच सपोर्ट वाले भाषा पैक इंस्टॉल करें।",
    showRoundNumber: "राउंड नंबर दिखाएं",
    showRoundNumberDetail: "वर्तमान राउंड संकेतक दिखाएं",
    showTotalTime: "कुल समय दिखाएं",
    showTotalTimeDetail: "वर्कआउट का बचा कुल समय दिखाएं",
  },
};

function getCopy(languageId: string): UiCopy {
  return {
    ...enCopy,
    ...(localizedCopies[languageId] ?? {}),
    ...(localizedCompletionCopies[languageId] ?? {}),
  };
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

function getSteppedTimeValue(value: number, direction: -1 | 1, min: number, max: number, step: number) {
  const current = clamp(Math.round(value), min, max);
  const safeStep = Math.max(1, Math.round(step));

  if (direction > 0) {
    if (current < safeStep) {
      return clamp(safeStep, min, max);
    }

    const remainder = current % safeStep;
    return clamp(remainder === 0 ? current + safeStep : current + safeStep - remainder, min, max);
  }

  const remainder = current % safeStep;
  const next = remainder === 0 ? current - safeStep : current - remainder;
  return clamp(next < min ? min : next, min, max);
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

function getSoundEventLabel(copy: UiCopy, event: SoundEvent) {
  const labels: Record<SoundEvent, string> = {
    roundStart: copy.roundStartSound,
    restStart: copy.restStartSound,
    finish: copy.finishSound,
    roundWarning: copy.warningSound,
    restWarning: copy.restEndWarning,
    intervalSignal: copy.intervalSignalSound,
  };

  return labels[event];
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
  const [voicePermissionPending, setVoicePermissionPending] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const [shareStatus, setShareStatus] = useState("");
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
  const resolvedTheme = resolveTheme(activeProfile.theme.mode);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

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
      const customSound = customSounds.find((sound) => sound.id === soundId);
      if (customSound) {
        return customSound.label;
      }

      const builtInSound = getBuiltInSound(soundId);
      return builtInSound.id === "none" ? copy.noSound : builtInSound.label;
    },
    [copy.noSound, customSounds],
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

  useEffect(() => {
    if (!activeProfile.display.showVoiceHints && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [activeProfile.display.showVoiceHints]);

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

  const setNativePreventSleep = useCallback(async (enabled: boolean) => {
    try {
      await invoke("set_prevent_sleep", { enabled });
    } catch {
      // Browser wake lock remains as a fallback in environments without native support.
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

  const openSoundPicker = useCallback((event: SoundEvent) => {
    setSelectedSoundEvent(event);
    setView("soundPicker");
  }, []);

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

  const getSpeechRecognition = useCallback(() => {
    return (
      (window as typeof window & {
        SpeechRecognition?: new () => DesktopSpeechRecognition;
        webkitSpeechRecognition?: new () => DesktopSpeechRecognition;
      }).SpeechRecognition ??
      (window as typeof window & {
        webkitSpeechRecognition?: new () => DesktopSpeechRecognition;
      }).webkitSpeechRecognition
    );
  }, []);

  const handleVoiceControlToggle = useCallback(async () => {
    if (activeProfile.voice.voiceControl) {
      updateVoice({ voiceControl: false });
      setVoiceHint("");
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      updateVoice({ voiceControl: false });
      setVoiceHint(copy.voiceControlUnavailable);
      return;
    }

    setVoicePermissionPending(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not available");
      }
      const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
      stream?.getTracks().forEach((track) => track.stop());
      updateVoice({ voiceControl: true });
      setVoiceHint("");
    } catch {
      updateVoice({ voiceControl: false });
      setVoiceHint(copy.microphoneRequired);
    } finally {
      setVoicePermissionPending(false);
    }
  }, [
    activeProfile.voice.voiceControl,
    copy.microphoneRequired,
    copy.voiceControlUnavailable,
    getSpeechRecognition,
    updateVoice,
  ]);

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
      void setNativePreventSleep(true);
      return () => {
        void setNativePreventSleep(false);
        void releaseWakeLock();
      };
    }

    void setNativePreventSleep(false);
    void releaseWakeLock();
    return undefined;
  }, [activeProfile.display.preventSleep, releaseWakeLock, requestWakeLock, runState, setNativePreventSleep]);

  useEffect(() => {
    if (runState !== "running" || !currentSegment) {
      return;
    }

    const segmentKey = `${currentSegment.phase}:${currentSegment.round}:${currentSegment.startsAt}`;
    const remaining = Math.ceil(currentSegment.endsAt - elapsed);
    if (!playedSegments.current.has(segmentKey)) {
      playedSegments.current.add(segmentKey);
      if (currentSegment.phase === "round") {
        playSound(activeProfile.sounds.roundStart);
      }
      if (currentSegment.phase === "rest") {
        playSound(activeProfile.sounds.restStart);
      }
    }

    const announcedRound =
      currentSegment.phase === "prepare"
        ? currentSegment.round
        : currentSegment.phase === "rest"
          ? Math.min(currentSegment.round + 1, activeProfile.timer.rounds)
          : null;

    if (
      announcedRound !== null &&
      activeProfile.display.showVoiceHints &&
      activeProfile.voice.announceRound &&
      remaining <= ROUND_ANNOUNCE_LEAD_SECONDS &&
      remaining > 0 &&
      !announcedRounds.current.has(announcedRound)
    ) {
      announcedRounds.current.add(announcedRound);
      speak(`Round ${announcedRound}`);
    }

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
      activeProfile.display.showVoiceHints &&
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
      activeProfile.display.showVoiceHints &&
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

  const handleCopyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleShareSite = useCallback(async () => {
    const shareData = {
      title: "MatClock",
      text: "MatClock Fight Interval Timer",
      url: SITE_URL,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setShareStatus(copy.shareWebsite);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    const copied = await handleCopyText(SITE_URL);
    setShareStatus(copied ? copy.linkCopied : SITE_URL);
  }, [copy.linkCopied, copy.shareWebsite, handleCopyText]);

  const handleOpenSpeechSettings = useCallback(async () => {
    try {
      await invoke("open_speech_settings");
    } catch {
      window.open("ms-settings:speech", "_blank", "noopener,noreferrer");
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!shareStatus) {
      return undefined;
    }

    const timer = window.setTimeout(() => setShareStatus(""), 2500);
    return () => window.clearTimeout(timer);
  }, [shareStatus]);

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

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setVoiceHint(copy.voiceControlUnavailable);
      updateVoice({ voiceControl: false });
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

    recognition.onerror = (event) => {
      const permissionError = event?.error === "not-allowed" || event?.error === "service-not-allowed";
      setVoiceHint(permissionError ? copy.microphoneRequired : copy.voiceCommandError);
      if (permissionError) {
        updateVoice({ voiceControl: false });
      }
    };

    try {
      recognition.start();
    } catch {
      setVoiceHint(copy.voiceControlUnavailable);
      updateVoice({ voiceControl: false });
      return undefined;
    }

    return () => recognition.stop();
  }, [
    activeLanguage.speechLang,
    activeProfile.voice.voiceControl,
    copy.microphoneRequired,
    copy.voiceCommandError,
    copy.voiceControlUnavailable,
    getSpeechRecognition,
    handlePause,
    handleReset,
    handleResume,
    handleStart,
    runState,
    updateVoice,
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
            onClick={() => openSoundPicker("roundStart")}
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
            detail={copy.warningSound}
            label={copy.roundEndWarning}
            max={300}
            seconds={activeProfile.timer.warningSeconds}
            step={5}
            onChange={(warningSeconds) => updateTimer({ warningSeconds })}
          />
          <TimeRow
            detail={copy.signalInsideRoundDetail}
            label={copy.signalInsideRound}
            max={600}
            seconds={activeProfile.timer.intervalSignalSeconds}
            step={5}
            onChange={(intervalSignalSeconds) => updateTimer({ intervalSignalSeconds })}
          />
          <ToggleRow
            checked={activeProfile.timer.restEndWarningSeconds > 0}
            detail={copy.restEndWarning}
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
          {soundEvents.map((event) => (
            <SettingsRow
              detail={getSoundLabel(activeProfile.sounds[event])}
              key={event}
              label={getSoundEventLabel(copy, event)}
              onClick={() => openSoundPicker(event)}
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
            detail={copy.voiceRoundAnnounceDetail}
            label={copy.announceRoundNumber}
            onChange={(announceRound) => updateVoice({ announceRound })}
          />
          <NumberRow
            detail={copy.voiceCountdownRoundDetail}
            label={copy.roundCountdown}
            max={60}
            min={0}
            value={activeProfile.voice.roundCountdownSeconds}
            onChange={(roundCountdownSeconds) => updateVoice({ roundCountdownSeconds })}
          />
          <NumberRow
            detail={copy.voiceCountdownRestDetail}
            label={copy.restCountdown}
            max={60}
            min={0}
            value={activeProfile.voice.restCountdownSeconds}
            onChange={(restCountdownSeconds) => updateVoice({ restCountdownSeconds })}
          />
          <SettingsRow
            detail={voicePermissionPending ? copy.requestingMicrophone : activeProfile.voice.voiceControl ? copy.on : copy.off}
            label={copy.voiceControl}
            onClick={() => {
              void handleVoiceControlToggle();
            }}
          />
        </Section>

        <Section title={copy.displayBehavior}>
          <SettingsRow
            detail={copy.timerAppearanceDetail}
            label={copy.timerScreen}
            onClick={() => setView("timerScreen")}
          />
          <SelectRow
            label={copy.theme}
            options={[copy.themeDark, copy.themeLight]}
            value={activeProfile.theme.mode === "light" ? copy.themeLight : copy.themeDark}
            onChange={(mode) => updateTheme({ mode: mode === copy.themeLight ? "light" : "dark" })}
          />
          <ToggleRow
            checked={activeProfile.display.preventSleep}
            detail={copy.keepScreenAwakeDetail}
            label={copy.preventSleep}
            onChange={(preventSleep) => updateDisplay({ preventSleep })}
          />
        </Section>

        <Section title={copy.about}>
          <IconRow
            label={copy.website}
            value={shareStatus || SITE_URL}
            onClick={() => {
              handleOpenExternal(SITE_URL);
            }}
            onShare={() => {
              void handleShareSite();
            }}
          />
          <IconRow label={copy.rate} value={copy.comingSoon} />
          <IconRow
            label={copy.contactDevelopers}
            value="support@matclock.online"
            onClick={() => handleOpenExternal("mailto:support@matclock.online")}
          />
          <IconRow
            label={copy.privacyPolicy}
            value={copy.localProfilesOnly}
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
                    aria-label={copy.profileName}
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
                    detail={copy.warningSound}
                    label={copy.roundEndWarning}
                    max={300}
                    seconds={draftTimer.warningSeconds}
                    step={5}
                    onChange={(warningSeconds) => updateProfileTimerDraft(profile, { warningSeconds })}
                  />
                  <TimeRow
                    detail={copy.signalInsideRoundDetail}
                    label={copy.signalInsideRound}
                    max={600}
                    seconds={draftTimer.intervalSignalSeconds}
                    step={5}
                    onChange={(intervalSignalSeconds) => updateProfileTimerDraft(profile, { intervalSignalSeconds })}
                  />
                  <ToggleRow
                    checked={draftTimer.restEndWarningSeconds > 0}
                    detail={copy.restEndWarning}
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
      <SettingsLayout backLabel={copy.back} title={copy.roundSettings} onBack={() => setView("settings")}>
        <Section title={copy.mode}>
          <ToggleRow
            checked={activeProfile.flexibleRoundsEnabled}
            detail={copy.flexibleTimeDetail}
            label={copy.flexibleTime}
            onChange={(flexibleRoundsEnabled) => updateActiveProfile((profile) => ({
              ...profile,
              flexibleRoundsEnabled,
            }))}
          />
        </Section>
        {activeProfile.flexibleRounds.map((round, index) => (
          <Section key={index} title={`${copy.round} ${index + 1}`}>
            <TimeRow
              marker="green"
              label={copy.fightLabel}
              max={7200}
              min={5}
              seconds={round.roundSeconds}
              step={30}
              onChange={(roundSeconds) => updateFlexibleRound(index, { roundSeconds })}
            />
            {index < activeProfile.timer.rounds - 1 && (
              <TimeRow
                marker="red"
                label={copy.rest}
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
        action={<button className="accent-small" type="button" onClick={handleAddCustomSound}>{copy.add}</button>}
        backLabel={copy.back}
        title={getSoundEventLabel(copy, selectedSoundEvent)}
        onBack={() => setView("settings")}
      >
        <div className="sound-event-grid" aria-label={copy.soundSelection}>
          {soundEvents.map((event) => (
            <button
              aria-pressed={selectedSoundEvent === event}
              className={`sound-event-card${selectedSoundEvent === event ? " is-active" : ""}`}
              key={event}
              type="button"
              onClick={() => setSelectedSoundEvent(event)}
            >
              <span>{getSoundEventLabel(copy, event)}</span>
              <strong>{getSoundLabel(activeProfile.sounds[event])}</strong>
            </button>
          ))}
        </div>
        <h2 className="settings-subtitle">{copy.builtInSounds}</h2>
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
              <span>{sound.id === "none" ? copy.noSound : sound.label}</span>
              {activeProfile.sounds[selectedSoundEvent] === sound.id && <b>{copy.selectedSound}</b>}
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
      <SettingsLayout backLabel={copy.back} title={copy.voice} onBack={() => setView("settings")}>
        <div className="voice-placeholder">
          <p>{copy.speechSettingsHint}</p>
          <button
            className="secondary-action"
            type="button"
            onClick={() => {
              void handleOpenSpeechSettings();
            }}
          >
            {copy.openSpeechSettings}
          </button>
        </div>
        <Section title={copy.systemVoices}>
          <SelectRow
            label={copy.voice}
            options={[copy.auto, ...voiceOptions.map((voice) => voice.name)]}
            value={activeProfile.voice.voiceName || copy.auto}
            onChange={(voiceName) => updateVoice({ voiceName: voiceName === copy.auto ? "" : voiceName })}
          />
          <button className="wide-reset" type="button" onClick={() => speak("Round one")}>
            {copy.testVoice}
          </button>
        </Section>
      </SettingsLayout>
    );
  }

  if (view === "timerScreen") {
    return (
      <SettingsLayout backLabel={copy.back} title={copy.timerScreenTitle} onBack={() => setView("settings")}>
        <Section title={copy.display}>
          <ToggleRow
            checked={activeProfile.display.showTotalTime}
            detail={copy.showTotalTimeDetail}
            label={copy.showTotalTime}
            onChange={(showTotalTime) => updateDisplay({ showTotalTime })}
          />
          <ToggleRow
            checked={activeProfile.display.countUpPhaseTime}
            detail={copy.countUpTimer}
            label={copy.countUpTimer}
            onChange={(countUpPhaseTime) => updateDisplay({ countUpPhaseTime })}
          />
          <ToggleRow
            checked={activeProfile.display.showRoundNumber}
            detail={copy.showRoundNumberDetail}
            label={copy.showRoundNumber}
            onChange={(showRoundNumber) => updateDisplay({ showRoundNumber })}
          />
          <ToggleRow
            checked={activeProfile.display.showVoiceHints}
            detail={copy.voicePromptsDetail}
            label={copy.voicePrompts}
            onChange={(showVoiceHints) => updateDisplay({ showVoiceHints })}
          />
          <ToggleRow
            checked={activeProfile.display.alwaysOnTop}
            detail={copy.alwaysOnTop}
            label={copy.alwaysOnTop}
            onChange={handleAlwaysOnTop}
          />
        </Section>

        <Section title={copy.startButton}>
          <SelectRow
            label={copy.buttonText}
            options={startButtonTexts}
            value={activeProfile.theme.startButtonText}
            onChange={(startButtonText) => updateTheme({ startButtonText })}
          />
          <ColorRow
            label={copy.buttonColor}
            value={activeProfile.theme.startButtonColor}
            onChange={(startButtonColor) => updateTheme({ startButtonColor })}
          />
        </Section>

        <Section title={copy.colors}>
          <ColorRow
            label={copy.round}
            value={activeProfile.theme.roundColor}
            onChange={(roundColor) => updateTheme({ roundColor })}
          />
          <ColorRow
            label={copy.rest}
            value={activeProfile.theme.restColor}
            onChange={(restColor) => updateTheme({ restColor })}
          />
          <ColorRow
            label={copy.warning}
            value={activeProfile.theme.warningColor}
            onChange={(warningColor) => updateTheme({ warningColor })}
          />
          <button className="wide-reset" type="button" onClick={() => updateTheme({
            roundColor: "#00e676",
            restColor: "#dc2626",
            warningColor: "#90cdff",
          })}>
            {copy.resetColors}
          </button>
        </Section>

        <Section title={copy.fonts}>
          <SelectRow
            label={copy.timerFont}
            options={timerFonts}
            value={activeProfile.theme.timerFont}
            onChange={(timerFont) => updateTheme({ timerFont })}
          />
          <SelectRow
            label={copy.cardFont}
            options={cardFonts}
            value={activeProfile.theme.cardFont}
            onChange={(cardFont) => updateTheme({ cardFont })}
          />
        </Section>

        <Section title={copy.layout}>
          <NumberRow
            label={copy.topRowHeight}
            max={120}
            min={40}
            value={activeProfile.theme.topRowHeight}
            onChange={(topRowHeight) => updateTheme({ topRowHeight })}
          />
          <NumberRow
            label={copy.totalTime}
            max={220}
            min={80}
            value={activeProfile.theme.totalTimeHeight}
            onChange={(totalTimeHeight) => updateTheme({ totalTimeHeight })}
          />
          <NumberRow
            label={copy.buttonHeight}
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
            {copy.resetSettings}
          </button>
        </Section>
      </SettingsLayout>
    );
  }

  return (
    <main
      className={`app-frame matclock-desktop theme-${resolvedTheme}`}
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
          {activeProfile.display.showTotalTime && (
            <div className="total-card">
              <span className="panel-label">{copy.totalTime}</span>
              <strong>{formatTime(totalLeft)}</strong>
            </div>
          )}
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
  onShare,
  value,
  onClick,
}: {
  label: string;
  onShare?: () => void;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>
        <strong>{label}</strong>
      </span>
      <span className="icon-row-value">
        {onShare && (
          <button
            aria-label="Share"
            className="share-link-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShare();
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 10.7 15.4 6.3" />
              <path d="M8.6 13.3 15.4 17.7" />
            </svg>
          </button>
        )}
        <small>{value}</small>
      </span>
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
          onClick={() => update(getSteppedTimeValue(seconds, -1, min, max, step))}
        >
          -
        </button>
        <strong>{formatSettingTime(seconds)}</strong>
        <button
          aria-label={`Increase ${label}`}
          disabled={seconds >= max}
          type="button"
          onClick={() => update(getSteppedTimeValue(seconds, 1, min, max, step))}
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
  const [isOpen, setIsOpen] = useState(false);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  };

  return (
    <div className="settings-row is-static custom-select-row" onBlur={handleBlur}>
      <span>
        <strong>{label}</strong>
      </span>
      <div className="custom-select">
        <button
          aria-expanded={isOpen}
          className="custom-select-trigger"
          type="button"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span>{value}</span>
          <b>v</b>
        </button>
        {isOpen && (
          <div className="custom-select-menu">
            {options.map((option) => (
              <button
                className={option === value ? "is-selected" : ""}
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
