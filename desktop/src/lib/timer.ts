import { FlexibleRound, Profile, TimerPhase, TimerSettings } from "../types";

export type Segment = {
  phase: Exclude<TimerPhase, "idle" | "finished">;
  round: number;
  duration: number;
  startsAt: number;
  endsAt: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatTime(totalSeconds: number) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getRoundTiming(settings: TimerSettings, flexibleRounds: FlexibleRound[], round: number) {
  const flexible = flexibleRounds[round - 1];

  return {
    roundSeconds: flexible?.roundSeconds ?? settings.roundSeconds,
    restSeconds: flexible?.restSeconds ?? settings.restSeconds,
  };
}

export function buildSegments(profile: Profile): Segment[] {
  const segments: Segment[] = [];
  const { timer } = profile;
  let cursor = 0;

  if (timer.prepareSeconds > 0) {
    segments.push({
      phase: "prepare",
      round: 1,
      duration: timer.prepareSeconds,
      startsAt: cursor,
      endsAt: cursor + timer.prepareSeconds,
    });
    cursor += timer.prepareSeconds;
  }

  for (let round = 1; round <= timer.rounds; round += 1) {
    const timing = profile.flexibleRoundsEnabled
      ? getRoundTiming(timer, profile.flexibleRounds, round)
      : { roundSeconds: timer.roundSeconds, restSeconds: timer.restSeconds };

    segments.push({
      phase: "round",
      round,
      duration: timing.roundSeconds,
      startsAt: cursor,
      endsAt: cursor + timing.roundSeconds,
    });
    cursor += timing.roundSeconds;

    if (round < timer.rounds && timing.restSeconds > 0) {
      segments.push({
        phase: "rest",
        round,
        duration: timing.restSeconds,
        startsAt: cursor,
        endsAt: cursor + timing.restSeconds,
      });
      cursor += timing.restSeconds;
    }
  }

  return segments;
}

export function getTotalDuration(profile: Profile) {
  const segments = buildSegments(profile);
  return segments[segments.length - 1]?.endsAt ?? 0;
}

export function getTimerSnapshot(profile: Profile, elapsedSeconds: number) {
  const segments = buildSegments(profile);
  const totalDuration = getTotalDuration(profile);

  if (elapsedSeconds >= totalDuration) {
    return {
      phase: "finished" as TimerPhase,
      round: profile.timer.rounds,
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
      remaining: profile.timer.prepareSeconds,
      elapsed: 0,
      totalDuration,
      progress: 0,
      segmentProgress: 0,
      nextPhase: "prepare" as TimerPhase,
    };
  }

  const remaining = Math.ceil(segment.endsAt - elapsedSeconds);
  const displayPhase =
    segment.phase === "round" && remaining <= profile.timer.warningSeconds
      ? "warning"
      : segment.phase;
  const segmentProgress = clamp((elapsedSeconds - segment.startsAt) / segment.duration, 0, 1);
  const nextSegment = segments.find((candidate) => candidate.startsAt >= segment.endsAt);

  return {
    phase: displayPhase as TimerPhase,
    round: segment.phase === "rest" ? Math.min(segment.round + 1, profile.timer.rounds) : segment.round,
    remaining: profile.display.countUpPhaseTime
      ? Math.floor(elapsedSeconds - segment.startsAt)
      : remaining,
    elapsed: elapsedSeconds,
    totalDuration,
    progress: totalDuration > 0 ? clamp(elapsedSeconds / totalDuration, 0, 1) : 0,
    segmentProgress,
    nextPhase: nextSegment?.phase ?? "finished",
  };
}
