import { Profile } from "../types";
import { defaultSoundSettings, normalizeSoundId } from "./sounds";

export const PROFILE_STORAGE_KEY = "matclock-desktop-profiles";
export const ACTIVE_PROFILE_KEY = "matclock-desktop-active-profile";
export const PROFILE_PRESET_VERSION_KEY = "matclock-desktop-profile-preset-version";
export const PROFILE_PRESET_VERSION = "2026-05-27-fight-presets";

export const defaultProfiles: Profile[] = [
  createProfile("pro-boxing-competition", "Pro Boxing (Competition)", 3 * 60, 60, 12, 30, 10),
  createProfile("amateur-boxing-olympic", "Amateur Boxing (Olympic Style)", 3 * 60, 60, 3, 20, 10),
  createProfile("training-boxing-gym-sparring", "Training Boxing (Gym Sparring)", 2 * 60, 60, 8, 10, 10),
  createProfile("ufc-pro-fight", "UFC Pro Fight", 5 * 60, 60, 5, 30, 10),
  createProfile("amateur-mma", "Amateur MMA", 3 * 60, 60, 3, 20, 10),
  createProfile("mma-conditioning", "MMA Conditioning", 3 * 60, 45, 6, 15, 10),
  createProfile("ibjjf-competition", "IBJJF Competition", 8 * 60, 0, 1, 10, 10),
  createProfile("bjj-rolling-training", "BJJ Rolling Training", 5 * 60, 60, 8, 10, 10),
  createProfile("bjj-beginner", "BJJ Beginner", 4 * 60, 60, 5, 10, 10),
  createProfile("stadium-fight-lumpinee-style", "Stadium Fight (Lumpinee Style)", 3 * 60, 2 * 60, 5, 30, 10),
  createProfile("amateur-muay-thai", "Amateur Muay Thai", 3 * 60, 60, 3, 20, 10),
  createProfile("tabata", "Tabata", 20, 10, 8, 10, 3),
  createProfile("hiit-standard", "HIIT Standard", 45, 20, 15, 10, 5),
  createProfile("circuit-training", "Circuit Training", 60, 45, 8, 10, 10),
];

export function createProfile(
  id: string,
  name: string,
  roundSeconds: number,
  restSeconds: number,
  rounds: number,
  prepareSeconds = 10,
  warningSeconds = 10,
): Profile {
  return {
    id,
    name,
    timer: {
      prepareSeconds,
      rounds,
      roundSeconds,
      restSeconds,
      warningSeconds,
      intervalSignalSeconds: 0,
      restEndWarningSeconds: Math.min(10, restSeconds),
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
    if (localStorage.getItem(PROFILE_PRESET_VERSION_KEY) !== PROFILE_PRESET_VERSION) {
      localStorage.setItem(PROFILE_PRESET_VERSION_KEY, PROFILE_PRESET_VERSION);
      saveProfiles(defaultProfiles);
      localStorage.setItem(ACTIVE_PROFILE_KEY, defaultProfiles[0].id);
      return defaultProfiles;
    }

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
