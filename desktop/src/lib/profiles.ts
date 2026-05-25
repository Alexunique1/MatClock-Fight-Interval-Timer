import { Profile } from "../types";
import { defaultSoundSettings, normalizeSoundId } from "./sounds";

export const PROFILE_STORAGE_KEY = "matclock-desktop-profiles";
export const ACTIVE_PROFILE_KEY = "matclock-desktop-active-profile";

export const defaultProfiles: Profile[] = [
  createProfile("amateur-boxing", "amateur boxing", 2 * 60, 60, 3),
  createProfile("mma", "mma", 5 * 60, 60, 5),
  createProfile("classic-boxing", "classic boxing", 3 * 60, 60, 12),
];

export function createProfile(
  id: string,
  name: string,
  roundSeconds: number,
  restSeconds: number,
  rounds: number,
): Profile {
  return {
    id,
    name,
    timer: {
      prepareSeconds: 10,
      rounds,
      roundSeconds,
      restSeconds,
      warningSeconds: 10,
      intervalSignalSeconds: 0,
      restEndWarningSeconds: 10,
    },
    flexibleRoundsEnabled: false,
    flexibleRounds: Array.from({ length: rounds }, () => ({ roundSeconds, restSeconds })),
    sounds: {
      ...defaultSoundSettings,
    },
    voice: {
      announceRound: true,
      roundCountdownSeconds: 0,
      restCountdownSeconds: 0,
      voiceControl: false,
      voiceName: "",
    },
    display: {
      showTotalTime: false,
      countUpTotalTime: false,
      countUpPhaseTime: false,
      showRoundNumber: true,
      showVoiceHints: true,
      alwaysOnTop: false,
      preventSleep: true,
    },
    theme: {
      mode: "dark",
      startButtonText: "Fight!",
      startButtonColor: "#d6272a",
      roundColor: "#0bbf19",
      restColor: "#af3a00",
      warningColor: "#b8d600",
      timerFont: "Consolas",
      cardFont: "Inter",
      topRowHeight: 60,
      totalTimeHeight: 120,
      buttonHeight: 52,
    },
  };
}

export function loadProfiles() {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) {
      return defaultProfiles;
    }

    const parsed = JSON.parse(saved) as Profile[];
    return parsed.length > 0 ? parsed.map(normalizeProfile) : defaultProfiles;
  } catch {
    return defaultProfiles;
  }
}

export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    voice: {
      announceRound: profile.voice?.announceRound ?? true,
      roundCountdownSeconds: profile.voice?.roundCountdownSeconds ?? 0,
      restCountdownSeconds: profile.voice?.restCountdownSeconds ?? 0,
      voiceControl: profile.voice?.voiceControl ?? false,
      voiceName: profile.voice?.voiceName ?? "",
    },
    sounds: {
      roundStart: normalizeSoundId(profile.sounds?.roundStart, defaultSoundSettings.roundStart),
      restStart: normalizeSoundId(profile.sounds?.restStart, defaultSoundSettings.restStart),
      finish: normalizeSoundId(profile.sounds?.finish, defaultSoundSettings.finish),
      roundWarning: normalizeSoundId(profile.sounds?.roundWarning, defaultSoundSettings.roundWarning),
      restWarning: normalizeSoundId(profile.sounds?.restWarning, defaultSoundSettings.restWarning),
      intervalSignal: normalizeSoundId(
        profile.sounds?.intervalSignal,
        defaultSoundSettings.intervalSignal,
      ),
    },
  };
}
