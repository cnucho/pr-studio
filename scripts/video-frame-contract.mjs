export const CAPTURE_VIEWPORT = Object.freeze({ width: 1920, height: 1080 });
export const OBSERVATION_SAFE_AREA = Object.freeze({ x: 48, y: 72, width: 1824, height: 756 });
export const OBSERVATION_HOLD_MS = 1400;

export function boxInside(box, area = OBSERVATION_SAFE_AREA) {
  if (!box || box.width <= 0 || box.height <= 0) return false;
  return (
    box.x >= area.x &&
    box.y >= area.y &&
    box.x + box.width <= area.x + area.width &&
    box.y + box.height <= area.y + area.height
  );
}

export function visualTransformForBeat(beat) {
  if (beat.medium === "still" && beat.screenId.endsWith("-output")) {
    return Object.freeze({ scaleX: 2048 / 1920, scaleY: 1152 / 1080, offsetX: -64, offsetY: -36 });
  }
  return Object.freeze({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
}

export function mapObservationBox(box, beat) {
  const transform = visualTransformForBeat(beat);
  return {
    x: box.x * transform.scaleX + transform.offsetX,
    y: box.y * transform.scaleY + transform.offsetY,
    width: box.width * transform.scaleX,
    height: box.height * transform.scaleY,
  };
}

export function cropObservationBox(box, frame = CAPTURE_VIEWPORT, margin = { x: 36, y: 24 }) {
  if (!boxInside(box, { x: 0, y: 0, width: frame.width, height: frame.height })) return null;
  const left = Math.max(0, Math.floor(box.x - margin.x));
  const top = Math.max(0, Math.floor(box.y - margin.y));
  const right = Math.min(frame.width, Math.ceil(box.x + box.width + margin.x));
  const bottom = Math.min(frame.height, Math.ceil(box.y + box.height + margin.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function verificationSampleOffsets(item, beat) {
  const duration = Number(item.durationSec);
  if (!Number.isFinite(duration) || duration <= 0) return [];
  if (beat.medium !== "motion") return [Math.max(0.05, duration / 2)];
  const stableStart = Number(item.verification?.stableStartSec ?? 0);
  const first = Math.min(Math.max(stableStart + 0.2, duration * 0.55), Math.max(0.05, duration - 1.25));
  const second = Math.min(Math.max(first + 0.6, duration * 0.7), Math.max(first, duration - 0.6));
  const third = Math.max(second, duration - 0.2);
  return [...new Set([first, second, third].map((value) => Number(value.toFixed(3))))];
}

export function observationMatches(matches, beat) {
  if (beat.medium !== "motion") return matches.some(Boolean);
  return matches.some((matched, index) => matched && matches[index + 1] === true);
}

export function motionSourceRange(mark, nextStartedAtMs) {
  if (!mark) return null;
  const startedAtMs = Number(mark.startedAtMs);
  const stableToMs = Number(mark.stableToMs ?? mark.endedAtMs);
  const endedAtMs = Number(mark.endedAtMs);
  if (![startedAtMs, stableToMs, endedAtMs].every(Number.isFinite)) return null;

  const startMs = Math.max(0, startedAtMs - 200);
  const endCandidates = [stableToMs, endedAtMs];
  const nextStart = Number(nextStartedAtMs);
  if (Number.isFinite(nextStart)) endCandidates.push(nextStart - 40);
  const endMs = Math.min(...endCandidates);
  if (endMs <= startMs + 100) return null;
  return { startMs, endMs, durationSec: (endMs - startMs) / 1000 };
}

export function finalReviewExitCode({ ready, ocrStatus, frameExtractionErrorCount }) {
  if (ocrStatus === "error" || frameExtractionErrorCount > 0) return 3;
  return ready ? 0 : 2;
}
