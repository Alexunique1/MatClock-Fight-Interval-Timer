export type TimerPhase = "idle" | "prepare" | "round" | "warning" | "rest" | "finished";

export type TimerSettings = {
  prepareSeconds: number;
  rounds: number;
  roundSeconds: number;
  restSeconds: number;
  warningSeconds: number;
  intervalSignalSeconds: number;
  restEndWarningSeconds: number;
};

export type FlexibleRound = {
  roundSeconds: number;
  restSeconds: number;
};

export type SoundEvent =
  | "roundStart"
  | "restStart"
  | "finish"
  | "roundWarning"
  | "restWarning"
  | "intervalSignal";

export type SoundSettings = Record<SoundEvent, string>;

export type VoiceSettings = {
  announceRound: boolean;
  roundCountdownSeconds: number;
  restCountdownSeconds: number;
  voiceControl: boolean;
};

export type DisplaySettings = {
  showTotalTime: boolean;
  countUpTotalTime: boolean;
  countUpPhaseTime: boolean;
  showRoundNumber: boolean;
  showVoiceHints: boolean;
  alwaysOnTop: boolean;
  preventSleep: boolean;
};

export type ThemeSettings = {
  mode: "dark" | "light" | "system";
  startButtonText: string;
  startButtonColor: string;
  roundColor: string;
  restColor: string;
  warningColor: string;
  timerFont: string;
  cardFont: string;
  topRowHeight: number;
  totalTimeHeight: number;
  buttonHeight: number;
};

export type Profile = {
  id: string;
  name: string;
  timer: TimerSettings;
  flexibleRoundsEnabled: boolean;
  flexibleRounds: FlexibleRound[];
  sounds: SoundSettings;
  voice: VoiceSettings;
  display: DisplaySettings;
  theme: ThemeSettings;
};

export type RunState = "idle" | "running" | "paused" | "finished";
