"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dictionaries,
  Dictionary,
  isRtl,
  Locale,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
} from "@/lib/i18n";
import {
  clamp,
  defaultSettings,
  formatTime,
  getTimerSnapshot,
  getTotalDuration,
  TimerSettings,
} from "@/lib/timer";
import { PwaRegister } from "./pwa-register";
import { SiteFooter } from "./site-footer";

type RunState = "idle" | "running" | "paused" | "finished";

const SETTINGS_KEY = "matclock-settings";

function readSavedSettings(): TimerSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) {
      return defaultSettings;
    }

    const parsed = JSON.parse(saved) as Partial<TimerSettings>;
    return sanitizeSettings({ ...defaultSettings, ...parsed });
  } catch {
    return defaultSettings;
  }
}

function sanitizeSettings(settings: TimerSettings): TimerSettings {
  return {
    rounds: clamp(Math.round(settings.rounds), 1, 99),
    prepareSeconds: clamp(Math.round(settings.prepareSeconds), 0, 600),
    roundSeconds: clamp(Math.round(settings.roundSeconds), 10, 3600),
    restSeconds: clamp(Math.round(settings.restSeconds), 0, 1800),
    warningSeconds: clamp(Math.round(settings.warningSeconds), 0, settings.roundSeconds),
  };
}

function KeyBadge({ children }: { children: React.ReactNode }) {
  return <span className="key-badge">{children}</span>;
}

function SocialIcon({ name }: { name: "facebook" | "x" | "instagram" }) {
  const icons = {
    facebook: (
      <path d="M16.7 13.3h-3.1V22H10v-8.7H7.6v-3H10V7.9c0-2.6 1.5-4 4.2-4 .8 0 1.9.1 2.4.3v2.7h-1.4c-1.2 0-1.6.5-1.6 1.6v1.8h2.9l-.5 3Z" />
    ),
    x: (
      <path d="M13.9 10.6 20.8 3h-1.6l-6 6.6L8.4 3H3l7.2 9.9L3 21h1.6l6.3-7 5.1 7h5.4l-7.5-10.4Zm-2.2 2.5-.7-1L5.2 4.2h2.4l4.7 6.5.7 1 6.1 8.3h-2.4l-5-6.9Z" />
    ),
    instagram: (
      <>
        <path d="M7.1 2.8h9.8c2.4 0 4.3 1.9 4.3 4.3v9.8c0 2.4-1.9 4.3-4.3 4.3H7.1a4.3 4.3 0 0 1-4.3-4.3V7.1c0-2.4 1.9-4.3 4.3-4.3Zm0 1.8a2.5 2.5 0 0 0-2.5 2.5v9.8a2.5 2.5 0 0 0 2.5 2.5h9.8a2.5 2.5 0 0 0 2.5-2.5V7.1a2.5 2.5 0 0 0-2.5-2.5H7.1Z" />
        <path d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Zm0 1.8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm4.7-2.9a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function StepperSetting({
  label,
  displayValue,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string;
  displayValue: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="setting-stepper">
      <span>{label}</span>
      <div className="stepper-controls">
        <button disabled={disabled} type="button" onClick={() => onChange(Math.max(min, value - step))}>
          -
        </button>
        <strong>{displayValue}</strong>
        <button disabled={disabled} type="button" onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </div>
    </div>
  );
}

export function TimerApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings);
  const [elapsed, setElapsed] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const startAudio = useRef<HTMLAudioElement | null>(null);
  const warningAudio = useRef<HTMLAudioElement | null>(null);
  const endAudio = useRef<HTMLAudioElement | null>(null);
  const startedRounds = useRef<Set<number>>(new Set());
  const warnedRounds = useRef<Set<number>>(new Set());
  const endedRounds = useRef<Set<number>>(new Set());
  const finishPlayed = useRef(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const dictionary: Dictionary = useMemo(() => dictionaries[locale], [locale]);
  const totalDuration = useMemo(() => getTotalDuration(settings), [settings]);
  const snapshot = useMemo(() => getTimerSnapshot(settings, elapsed), [settings, elapsed]);
  const displayPhase = runState === "paused" ? "paused" : snapshot.phase;
  const canEdit = runState === "idle" || runState === "finished";
  const ringProgress = Math.max(0.001, snapshot.segmentProgress);
  const completedRounds = Math.max(0, endedRounds.current.size);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLock.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      wakeLock.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLock.current?.release();
    } catch {
      // Wake Lock can already be released by the browser.
    } finally {
      wakeLock.current = null;
    }
  }, []);

  const play = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    setSettings(readSavedSettings());
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    setLocale(saved ? normalizeLocale(saved) : "en");
    localStorage.removeItem("matclock-locale");

    startAudio.current = new Audio("/sounds/start.mp3");
    warningAudio.current = new Audio("/sounds/warning.mp3");
    endAudio.current = new Audio("/sounds/end.mp3");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (runState !== "running" || startedAt === null) {
      return undefined;
    }

    const tick = () => {
      const nextElapsed = (Date.now() - startedAt) / 1000;
      setElapsed(Math.min(nextElapsed, totalDuration));
      if (nextElapsed >= totalDuration) {
        if (!finishPlayed.current) {
          finishPlayed.current = true;
          play(endAudio.current);
        }
        setRunState("finished");
        void releaseWakeLock();
      }
    };

    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [play, releaseWakeLock, runState, startedAt, totalDuration]);

  useEffect(() => {
    if (runState !== "running") {
      return;
    }

    for (let round = 1; round <= settings.rounds; round += 1) {
      const roundStartsAt =
        settings.prepareSeconds +
        (round - 1) * settings.roundSeconds +
        Math.max(0, round - 1) * settings.restSeconds;

      if (elapsed >= roundStartsAt && !startedRounds.current.has(round)) {
        startedRounds.current.add(round);
        play(startAudio.current);
        break;
      }
    }

    if (snapshot.phase === "warning" && !warnedRounds.current.has(snapshot.round)) {
      warnedRounds.current.add(snapshot.round);
      play(warningAudio.current);
    }

    for (let round = 1; round <= settings.rounds; round += 1) {
      const roundEndsAt =
        settings.prepareSeconds +
        round * settings.roundSeconds +
        Math.max(0, round - 1) * settings.restSeconds;

      if (elapsed >= roundEndsAt && !endedRounds.current.has(round)) {
        endedRounds.current.add(round);
        play(endAudio.current);
        break;
      }
    }

    if (snapshot.phase === "finished" && !finishPlayed.current) {
      finishPlayed.current = true;
      play(endAudio.current);
    }
  }, [elapsed, play, runState, settings, snapshot]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && runState === "running") {
        void requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [requestWakeLock, runState]);

  const updateSettings = useCallback((patch: Partial<TimerSettings>) => {
    setSettings((current) => sanitizeSettings({ ...current, ...patch }));
  }, []);

  const handleLocaleChange = useCallback((nextLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocale(nextLocale);
  }, []);

  const handleStart = useCallback(() => {
    startedRounds.current = new Set();
    warnedRounds.current = new Set();
    endedRounds.current = new Set();
    finishPlayed.current = false;
    setElapsed(0);
    setPausedElapsed(0);
    setStartedAt(Date.now());
    setRunState("running");
    void requestWakeLock();
  }, [requestWakeLock]);

  const handlePause = useCallback(() => {
    setPausedElapsed(elapsed);
    setRunState("paused");
    void releaseWakeLock();
  }, [elapsed, releaseWakeLock]);

  const handleResume = useCallback(() => {
    setStartedAt(Date.now() - pausedElapsed * 1000);
    setRunState("running");
    void requestWakeLock();
  }, [pausedElapsed, requestWakeLock]);

  const handleReset = useCallback(() => {
    setElapsed(0);
    setPausedElapsed(0);
    setStartedAt(null);
    setRunState("idle");
    startedRounds.current = new Set();
    warnedRounds.current = new Set();
    endedRounds.current = new Set();
    finishPlayed.current = false;
    void releaseWakeLock();
  }, [releaseWakeLock]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }

    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "SELECT") {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (runState === "running") {
          handlePause();
        } else if (runState === "paused") {
          handleResume();
        } else {
          handleStart();
        }
      }

      if (event.code === "KeyR") {
        handleReset();
      }

      if (event.code === "KeyF") {
        handleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFullscreen, handlePause, handleReset, handleResume, handleStart, runState]);

  const getPhaseLabel = useCallback(
    (phase: string | null) => {
      if (!phase) {
        return "-";
      }

      const labels: Record<string, string> = {
        idle: dictionary.ready,
        prepare: dictionary.prepare,
        round: dictionary.round,
        warning: dictionary.warning,
        rest: dictionary.rest,
        paused: dictionary.paused,
        finished: dictionary.finished,
      };

      return labels[phase] ?? phase;
    },
    [dictionary],
  );

  const phaseLabel = getPhaseLabel(displayPhase);
  const activeClass = `timer-circle phase-${displayPhase}`;

  return (
    <main className={`app-shell${isFullscreen ? " is-fullscreen" : ""}`}>
      <PwaRegister />

      <header className="top-app-bar">
        <a className="header-logo" href="#timer" aria-label="MatClock">
          <img src="/images/logo.png" alt="MatClock" />
        </a>
        <nav className="desktop-nav" aria-label="Primary">
          <a href="#timer">{dictionary.home}</a>
          <a href="#about">{dictionary.about}</a>
        </nav>
        <div className="header-social" aria-label="Social links">
          <a href="#social-facebook" aria-label="Facebook">
            <SocialIcon name="facebook" />
          </a>
          <a href="#social-x" aria-label="X">
            <SocialIcon name="x" />
          </a>
          <a href="#social-instagram" aria-label="Instagram">
            <SocialIcon name="instagram" />
          </a>
        </div>
      </header>

      <section className="timer-dashboard" id="timer">
        <aside className="total-card">
          <div>
            <span className="panel-label">{dictionary.totalTime}</span>
          </div>
          <strong>{formatTime(totalDuration)}</strong>
        </aside>

        <section className="timer-center" aria-label={dictionary.title}>
          <div className="store-badges" id="stores">
            <a href="#stores" aria-label="Download on the App Store">
              <img src="/images/badges/app-store.svg" alt="Download on the App Store" />
            </a>
            <a href="#stores" aria-label="Get it on Google Play">
              <img src="/images/badges/google-play.png" alt="Get it on Google Play" />
            </a>
            <a href="#desktop" aria-label="Get it from Microsoft Store">
              <img src="/images/badges/microsoft-store.svg" alt="Get it from Microsoft Store" />
            </a>
          </div>

          <div className={activeClass}>
            <svg className="progress-ring" viewBox="0 0 100 100" aria-hidden>
              <circle className="ring-track" cx="50" cy="50" r="47" />
              <circle
                className="ring-progress"
                cx="50"
                cy="50"
                r="47"
                pathLength={1}
                style={{ strokeDashoffset: 1 - ringProgress }}
              />
            </svg>

            <div className="timer-core">
              <span className="round-label">
                {phaseLabel} · {String(snapshot.round).padStart(2, "0")}/
                {String(settings.rounds).padStart(2, "0")}
              </span>
              <div className="timer-face" aria-live="polite">
                {formatTime(snapshot.remaining)}
              </div>
              <div className="control-row">
                {(runState === "idle" || runState === "finished") && (
                  <button className="primary-action" type="button" onClick={handleStart}>
                    {dictionary.start} <KeyBadge>Space</KeyBadge>
                  </button>
                )}
                {runState === "running" && (
                  <button className="primary-action is-running" type="button" onClick={handlePause}>
                    {dictionary.pause} <KeyBadge>Space</KeyBadge>
                  </button>
                )}
                {runState === "paused" && (
                  <button className="primary-action" type="button" onClick={handleResume}>
                    {dictionary.resume} <KeyBadge>Space</KeyBadge>
                  </button>
                )}
                <button className="secondary-action" type="button" onClick={handleReset}>
                  {dictionary.reset} <KeyBadge>R</KeyBadge>
                </button>
              </div>

              <button className="maximize-action" type="button" onClick={handleFullscreen}>
                ⛶ {isFullscreen ? dictionary.minimize : dictionary.maximize} <KeyBadge>F</KeyBadge>
              </button>
            </div>
          </div>

          <div className="round-indicators" aria-hidden>
            {Array.from({ length: settings.rounds }, (_, index) => (
              <span
                className={
                  index < completedRounds
                    ? "is-complete"
                    : index + 1 === snapshot.round
                      ? "is-current"
                      : undefined
                }
                key={index}
              />
            ))}
          </div>
        </section>

        <aside className="settings-panel" id="settings">
          <StepperSetting
            disabled={!canEdit}
            displayValue={String(settings.rounds).padStart(2, "0")}
            label={dictionary.rounds}
            max={99}
            min={1}
            value={settings.rounds}
            onChange={(value) => updateSettings({ rounds: value })}
          />
          <StepperSetting
            disabled={!canEdit}
            displayValue={formatTime(settings.roundSeconds)}
            label={dictionary.roundTime}
            max={3600}
            min={10}
            step={15}
            value={settings.roundSeconds}
            onChange={(value) => updateSettings({ roundSeconds: value })}
          />
          <StepperSetting
            disabled={!canEdit}
            displayValue={formatTime(settings.restSeconds)}
            label={dictionary.restTime}
            max={1800}
            min={0}
            step={5}
            value={settings.restSeconds}
            onChange={(value) => updateSettings({ restSeconds: value })}
          />
          <StepperSetting
            disabled={!canEdit}
            displayValue={formatTime(settings.prepareSeconds)}
            label={dictionary.prepareTime}
            max={600}
            min={0}
            step={5}
            value={settings.prepareSeconds}
            onChange={(value) => updateSettings({ prepareSeconds: value })}
          />
          <StepperSetting
            disabled={!canEdit}
            displayValue={formatTime(settings.warningSeconds)}
            label={dictionary.warningTime}
            max={settings.roundSeconds}
            min={0}
            step={5}
            value={settings.warningSeconds}
            onChange={(value) => updateSettings({ warningSeconds: value })}
          />
        </aside>
      </section>

      {!isFullscreen && (
        <SiteFooter dictionary={dictionary} locale={locale} onLocaleChange={handleLocaleChange} />
      )}
    </main>
  );
}
