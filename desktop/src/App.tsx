import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { buildSegments, getTimerSnapshot, getTotalDuration, formatTime } from "./lib/timer";
import {
  ACTIVE_PROFILE_KEY,
  defaultProfiles,
  loadProfiles,
  saveProfiles,
} from "./lib/profiles";
import { getBuiltInSound, getSoundFile, soundEventLabels } from "./lib/sounds";
import { Profile, RunState, TimerPhase } from "./types";

type View = "timer" | "settings";

const phaseLabels: Record<TimerPhase, string> = {
  idle: "Ready",
  prepare: "Prepare",
  round: "Round",
  warning: "Warning",
  rest: "Rest",
  finished: "Finished",
};

export function App() {
  const [view, setView] = useState<View>("timer");
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles);
  const [activeProfileId, setActiveProfileId] = useState(defaultProfiles[1].id);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedElapsed, setPausedElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playedSegments = useRef<Set<string>>(new Set());
  const warnedRounds = useRef<Set<number>>(new Set());
  const restWarnedRounds = useRef<Set<number>>(new Set());
  const intervalSignals = useRef<Set<string>>(new Set());
  const finishPlayed = useRef(false);

  useEffect(() => {
    const loadedProfiles = loadProfiles();
    const savedActiveProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
    setProfiles(loadedProfiles);
    setActiveProfileId(savedActiveProfile ?? loadedProfiles[0]?.id ?? defaultProfiles[0].id);
  }, []);

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }, [activeProfileId]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? defaultProfiles[0],
    [activeProfileId, profiles],
  );

  const totalDuration = useMemo(() => getTotalDuration(activeProfile), [activeProfile]);
  const snapshot = useMemo(() => getTimerSnapshot(activeProfile, elapsed), [activeProfile, elapsed]);
  const currentSegment = useMemo(
    () =>
      buildSegments(activeProfile).find(
        (segment) => elapsed >= segment.startsAt && elapsed < segment.endsAt,
      ),
    [activeProfile, elapsed],
  );
  const displayPhase = runState === "paused" ? "idle" : snapshot.phase;
  const topRoundTime = formatTime(activeProfile.timer.roundSeconds);
  const topRestTime = formatTime(activeProfile.timer.restSeconds);

  const resetSoundMarkers = useCallback(() => {
    playedSegments.current = new Set();
    warnedRounds.current = new Set();
    restWarnedRounds.current = new Set();
    intervalSignals.current = new Set();
    finishPlayed.current = false;
  }, []);

  const playSound = useCallback((soundId: string) => {
    const file = getSoundFile(soundId);
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
  }, []);

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
    }, 150);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [runState, startedAt, totalDuration]);

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

  const handleSelectProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
    setProfileMenuOpen(false);
    resetSoundMarkers();
    setElapsed(0);
    setPausedElapsed(0);
    setStartedAt(null);
    setRunState("idle");
  }, [resetSoundMarkers]);

  useEffect(() => {
    if (runState !== "running" || !currentSegment) {
      return;
    }

    const segmentKey = `${currentSegment.phase}:${currentSegment.round}:${currentSegment.startsAt}`;
    if (!playedSegments.current.has(segmentKey)) {
      playedSegments.current.add(segmentKey);
      if (currentSegment.phase === "round") {
        playSound(activeProfile.sounds.roundStart);
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
      currentSegment.phase === "rest" &&
      activeProfile.timer.restEndWarningSeconds > 0 &&
      remaining <= activeProfile.timer.restEndWarningSeconds &&
      !restWarnedRounds.current.has(currentSegment.round)
    ) {
      restWarnedRounds.current.add(currentSegment.round);
      playSound(activeProfile.sounds.restWarning);
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
  }, [activeProfile, currentSegment, elapsed, playSound, runState]);

  useEffect(() => {
    if (runState === "finished" && !finishPlayed.current) {
      finishPlayed.current = true;
      playSound(activeProfile.sounds.finish);
    }
  }, [activeProfile.sounds.finish, playSound, runState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
        void handleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFullscreen, handlePause, handleReset, handleResume, handleStart, runState]);

  if (view === "settings") {
    return (
      <main className="app-frame settings-view">
        <header className="window-titlebar">MatClock Desktop</header>
        <section className="settings-shell">
          <button className="text-button" type="button" onClick={() => setView("timer")}>
            Back to timer
          </button>
          <h1>Settings</h1>
          <p className="muted">
            Desktop settings are scaffolded for the next phase: profiles, flexible rounds, sounds,
            voice, display, and layout.
          </p>
          <div className="settings-grid">
            {profiles.map((profile) => (
              <article className="profile-card" key={profile.id}>
                <strong>{profile.name}</strong>
                <span>Round: {formatTime(profile.timer.roundSeconds)}</span>
                <span>Rest: {formatTime(profile.timer.restSeconds)}</span>
              </article>
            ))}
          </div>
          <h2>Built-in sounds</h2>
          <div className="settings-grid">
            {Object.entries(activeProfile.sounds).map(([event, soundId]) => (
              <button
                className="sound-row"
                key={event}
                type="button"
                onClick={() => playSound(soundId)}
              >
                <span>{soundEventLabels[event as keyof typeof soundEventLabels]}</span>
                <strong>{getBuiltInSound(soundId).label}</strong>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-frame">
      <header className="window-titlebar">MatClock Desktop</header>

      <section className="quick-stats" aria-label="Current profile summary">
        <InfoCard label="Round" value={topRoundTime} />
        <div className="info-card profile-picker">
          <button type="button" onClick={() => setProfileMenuOpen((open) => !open)}>
            <span>Profile</span>
            <strong>{activeProfile.name}</strong>
          </button>
          {profileMenuOpen && (
            <div className="profile-menu">
              {profiles.map((profile) => (
                <button
                  className={profile.id === activeProfile.id ? "is-active" : undefined}
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelectProfile(profile.id)}
                >
                  {profile.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <InfoCard label="Rest" value={topRestTime} />
      </section>

      <section className={`timer-stage phase-${displayPhase}`}>
        <p className="phase-label">{phaseLabels[displayPhase]}</p>
        <div className="desktop-timer">{formatTime(snapshot.remaining)}</div>
        {activeProfile.display.showRoundNumber && (
          <p className="round-counter">
            Round {snapshot.round}/{activeProfile.timer.rounds}
          </p>
        )}
      </section>

      <section className="bottom-actions">
        {runState === "idle" || runState === "finished" ? (
          <button className="primary-action" type="button" onClick={handleStart}>
            {activeProfile.theme.startButtonText}
          </button>
        ) : runState === "running" ? (
          <button className="primary-action" type="button" onClick={handlePause}>
            Pause
          </button>
        ) : (
          <button className="primary-action" type="button" onClick={handleResume}>
            Resume
          </button>
        )}

        {runState === "idle" || runState === "finished" ? (
          <button className="secondary-action" type="button" onClick={() => setView("settings")}>
            Settings
          </button>
        ) : (
          <button className="secondary-action" type="button" onClick={handleReset}>
            Reset
          </button>
        )}
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
