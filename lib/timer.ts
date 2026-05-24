export type TimerSettings = {
  rounds: number;
  prepareSeconds: number;
  roundSeconds: number;
  restSeconds: number;
  warningSeconds: number;
};

export type TimerPhase = "idle" | "prepare" | "round" | "warning" | "rest" | "finished";

export type Segment = {
  phase: Exclude<TimerPhase, "idle" | "finished">;
  round: number;
  duration: number;
  startsAt: number;
  endsAt: number;
};

export const defaultSettings: TimerSettings = {
  rounds: 5,
  prepareSeconds: 10,
  roundSeconds: 180,
  restSeconds: 30,
  warningSeconds: 15,
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function buildSegments(settings: TimerSettings): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  if (settings.prepareSeconds > 0) {
    segments.push({
      phase: "prepare",
      round: 1,
      duration: settings.prepareSeconds,
      startsAt: cursor,
      endsAt: cursor + settings.prepareSeconds,
    });
    cursor += settings.prepareSeconds;
  }

  for (let round = 1; round <= settings.rounds; round += 1) {
    segments.push({
      phase: "round",
      round,
      duration: settings.roundSeconds,
      startsAt: cursor,
      endsAt: cursor + settings.roundSeconds,
    });
    cursor += settings.roundSeconds;

    if (round < settings.rounds && settings.restSeconds > 0) {
      segments.push({
        phase: "rest",
        round,
        duration: settings.restSeconds,
        startsAt: cursor,
        endsAt: cursor + settings.restSeconds,
      });
      cursor += settings.restSeconds;
    }
  }

  return segments;
}

export function getTotalDuration(settings: TimerSettings) {
  const segments = buildSegments(settings);
  return segments[segments.length - 1]?.endsAt ?? 0;
}

export function getTimerSnapshot(settings: TimerSettings, elapsedSeconds: number) {
  const segments = buildSegments(settings);
  const totalDuration = getTotalDuration(settings);

  if (elapsedSeconds >= totalDuration) {
    return {
      phase: "finished" as TimerPhase,
      round: settings.rounds,
      remaining: 0,
      elapsed: totalDuration,
      totalDuration,
      progress: 1,
      segmentProgress: 1,
      nextPhase: null as TimerPhase | null,
    };
  }

  const segment = segments.find(
    (candidate) => elapsedSeconds >= candidate.startsAt && elapsedSeconds < candidate.endsAt,
  );

  if (!segment) {
    return {
      phase: "idle" as TimerPhase,
      round: 1,
      remaining: settings.prepareSeconds,
      elapsed: 0,
      totalDuration,
      progress: 0,
      segmentProgress: 0,
      nextPhase: "prepare" as TimerPhase,
    };
  }

  const remaining = Math.ceil(segment.endsAt - elapsedSeconds);
  const displayPhase =
    segment.phase === "round" && remaining <= settings.warningSeconds ? "warning" : segment.phase;
  const segmentProgress = clamp((elapsedSeconds - segment.startsAt) / segment.duration, 0, 1);
  const nextSegment = segments.find((candidate) => candidate.startsAt >= segment.endsAt);

  return {
    phase: displayPhase as TimerPhase,
    round: segment.phase === "rest" ? Math.min(segment.round + 1, settings.rounds) : segment.round,
    remaining,
    elapsed: elapsedSeconds,
    totalDuration,
    progress: totalDuration > 0 ? clamp(elapsedSeconds / totalDuration, 0, 1) : 0,
    segmentProgress,
    nextPhase: nextSegment?.phase ?? "finished",
  };
}

export function formatTime(totalSeconds: number) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
