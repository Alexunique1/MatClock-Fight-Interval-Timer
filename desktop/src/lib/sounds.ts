import { SoundEvent, SoundSettings } from "../types";

export type BuiltInSound = {
  id: string;
  label: string;
  file: string | null;
};

export const builtInSounds: BuiltInSound[] = [
  { id: "none", label: "No sound", file: null },
  { id: "start1", label: "Start 1", file: "/sounds/Start1.mp3" },
  { id: "start2", label: "Start 2", file: "/sounds/Start2.mp3" },
  { id: "start3", label: "Start 3", file: "/sounds/Start3.mp3" },
  { id: "start4", label: "Start 4", file: "/sounds/Start4.mp3" },
  { id: "end1", label: "End 1", file: "/sounds/End1.mp3" },
  { id: "end2", label: "End 2", file: "/sounds/End2.mp3" },
  { id: "end3", label: "End 3", file: "/sounds/End3.mp3" },
  { id: "end4", label: "End 4", file: "/sounds/End4.mp3" },
  { id: "warning1", label: "Warning 1", file: "/sounds/Warning1.mp3" },
  { id: "warning2", label: "Warning 2", file: "/sounds/Warning2.mp3" },
  { id: "alarm1", label: "Alarm 1", file: "/sounds/Alarm1.mp3" },
];

export const defaultSoundSettings: SoundSettings = {
  roundStart: "start1",
  restStart: "start1",
  finish: "start1",
  roundWarning: "warning1",
  restWarning: "warning2",
  intervalSignal: "alarm1",
};

export const soundEventLabels: Record<SoundEvent, string> = {
  roundStart: "Round start",
  restStart: "Rest start",
  finish: "Finish",
  roundWarning: "Round warning",
  restWarning: "Rest warning",
  intervalSignal: "Interval signal",
};

export function getBuiltInSound(soundId: string) {
  return builtInSounds.find((sound) => sound.id === soundId) ?? builtInSounds[0];
}

export function getSoundFile(soundId: string) {
  return getBuiltInSound(soundId).file;
}

export function normalizeSoundId(soundId: string, fallback: string) {
  return builtInSounds.some((sound) => sound.id === soundId) ? soundId : fallback;
}
