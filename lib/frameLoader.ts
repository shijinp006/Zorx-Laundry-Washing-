import { TOTAL_FRAMES, frameSrc } from "./story";

/**
 * A contiguous slice of the film.
 *
 * The homepage scrubs the whole sequence; an inner page scrubs one shot out of
 * it (see `config/strips.ts`). Everything below works in absolute frame
 * numbers, so a strip and the full film name the same frames — and share the
 * same HTTP cache entries, which is why a visitor who has watched the film gets
 * every inner-page strip for free.
 */
export interface FrameRange {
  from: number;
  to: number;
}

export const FULL_RANGE: FrameRange = { from: 1, to: TOTAL_FRAMES };

/** Opening frames guaranteed before the experience is revealed. */
const OPENING_FRAMES = 20;
/**
 * One frame in every stride stays decoded for the life of the page. Jumping
 * anywhere in the runway then always lands within half a stride of something
 * drawable, which is what keeps nav clicks and scrollbar flings from flashing.
 */
const PINNED_STRIDE = 16;
/**
 * Ranges shorter than this pin every frame instead of a skeleton.
 *
 * Below ~24 frames the entire slice costs less memory than the full film's
 * skeleton plus its LRU cache, so there is nothing to gain by evicting — and a
 * strip that holds all of its frames cannot stutter at all.
 */
const PIN_EVERYTHING_BELOW = 25;
/** Decoded frames held outside the pinned set, evicted least-recently-used. */
const CACHE_LIMIT = 40;
/** How far ahead/behind the current frame to decode, biased to scroll direction. */
const LOOKAHEAD = 18;
const LOOKBEHIND = 6;
/** Parallel network fetches, and parallel decodes. */
const FETCH_CONCURRENCY = 8;
const DECODE_CONCURRENCY = 4;

/**
 * Loads and decodes a frame range within a fixed memory budget.
 *
 * The range is held as compressed blobs (~18 MB for all 239 frames), and only a
 * bounded window is ever decoded. Decoding all 239 would cost roughly 880 MB of
 * bitmaps (1280x720x4 each), which makes the browser evict and re-decode under
 * the scroll — the exact stutter this avoids. Evicted bitmaps are closed
 * explicitly rather than left for the GC.
 */
export class FrameLoader {
  private blobs = new Map<number, Blob>();
  /** Permanently resident bitmaps, one per stride. */
  private pinned = new Map<number, ImageBitmap>();
  /** LRU cache of decoded bitmaps; Map preserves insertion order. */
  private cache = new Map<number, ImageBitmap>();
  private decoding = new Set<number>();
  private decodeQueue: number[] = [];
  private activeDecodes = 0;
  private stopped = false;

  /** Current frame and scroll direction, used to aim the decode window. */
  private focus: number;
  private direction = 1;

  readonly from: number;
  readonly to: number;
  readonly count: number;
  private readonly stride: number;

  loadedCount = 0;
  readonly revealTarget: number;

  /**
   * @param onProgress Fired as the reveal set (the opening frames plus the
   *   pinned skeleton) lands. Drives the loading bar and the reveal.
   * @param onDecoded Fired after *any* frame finishes decoding, including the
   *   ones the scroll window pulls in later.
   *
   *   The second callback is not a nicety. `onProgress` only reports the ~35
   *   frames of the reveal set, so a frame decoded by `update()` used to notify
   *   nobody: stop scrolling while a stand-in is on screen and the exact frame
   *   would decode a moment later and never be drawn, leaving the canvas on the
   *   wrong frame until the next scroll nudged it.
   * @param range Which slice of the film to load. Defaults to all of it.
   */
  constructor(
    private onProgress: (loaded: number, revealTarget: number) => void,
    private onDecoded?: (frame: number) => void,
    range: FrameRange = FULL_RANGE
  ) {
    this.from = Math.max(1, Math.min(range.from, TOTAL_FRAMES));
    this.to = Math.max(this.from, Math.min(range.to, TOTAL_FRAMES));
    this.count = this.to - this.from + 1;
    this.stride = this.count < PIN_EVERYTHING_BELOW ? 1 : PINNED_STRIDE;
    this.focus = this.from;

    // Count the union, not the sum: the first frames of the range are both part
    // of the opening and part of the pinned skeleton.
    let required = 0;
    for (let i = this.from; i <= this.to; i++) {
      if (this.isRequired(i)) required++;
    }
    this.revealTarget = required;
  }

  private isOpening(frame: number) {
    return frame < this.from + OPENING_FRAMES;
  }

  private isPinned(frame: number) {
    return (
      frame === this.from ||
      frame === this.to ||
      (frame - this.from) % this.stride === 0
    );
  }

  /** Frames that have to be resident before the stage is revealed. */
  private isRequired(frame: number) {
    return this.isOpening(frame) || this.isPinned(frame);
  }

  async start() {
    // Fetch order: the opening, then the pinned skeleton, then everything else.
    const opening: number[] = [];
    for (let i = this.from; i <= this.to && this.isOpening(i); i++) {
      opening.push(i);
    }
    const seen = new Set(opening);
    const skeleton: number[] = [];
    for (let i = this.from; i <= this.to; i++) {
      if (this.isPinned(i) && !seen.has(i)) {
        skeleton.push(i);
        seen.add(i);
      }
    }
    const rest: number[] = [];
    for (let i = this.from; i <= this.to; i++) if (!seen.has(i)) rest.push(i);

    const queue = [...opening, ...skeleton, ...rest];
    let cursor = 0;

    const worker = async () => {
      while (!this.stopped && cursor < queue.length) {
        const frame = queue[cursor++];
        try {
          const res = await fetch(frameSrc(frame));
          if (!res.ok) continue;
          const blob = await res.blob();
          if (this.stopped) return;
          this.blobs.set(frame, blob);

          // Decode the frames that must be resident from the start.
          if (this.isRequired(frame)) await this.decode(frame);
        } catch {
          /* a missing frame falls back to its nearest neighbour */
        }

        if (this.isRequired(frame)) {
          this.loadedCount++;
          this.onProgress(this.loadedCount, this.revealTarget);
        }
      }
    };

    await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, () => worker()));
  }

  stop() {
    this.stopped = true;
    this.pinned.forEach((b) => b.close());
    this.cache.forEach((b) => b.close());
    this.pinned.clear();
    this.cache.clear();
    this.blobs.clear();
    this.decodeQueue.length = 0;
  }

  private async decode(frame: number) {
    if (this.stopped) return;
    if (this.pinned.has(frame) || this.cache.has(frame)) return;
    const blob = this.blobs.get(frame);
    if (!blob) return;

    this.decoding.add(frame);
    try {
      const bitmap = await createImageBitmap(blob);
      if (this.stopped) {
        bitmap.close();
        return;
      }
      if (this.isPinned(frame)) {
        this.pinned.set(frame, bitmap);
      } else {
        this.cache.set(frame, bitmap);
        this.evict();
      }
      this.onDecoded?.(frame);
    } catch {
      /* ignore undecodable frames; the nearest neighbour covers it */
    } finally {
      this.decoding.delete(frame);
    }
  }

  /** Drop least-recently-used bitmaps that are outside the active window. */
  private evict() {
    if (this.cache.size <= CACHE_LIMIT) return;
    const lo = this.focus - LOOKBEHIND * 2;
    const hi = this.focus + LOOKAHEAD * 2;

    for (const frame of [...this.cache.keys()]) {
      if (this.cache.size <= CACHE_LIMIT) break;
      if (frame >= lo && frame <= hi) continue; // still needed
      this.cache.get(frame)!.close();
      this.cache.delete(frame);
    }
    // If everything left is in-window, trim from the oldest anyway.
    while (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value as number;
      this.cache.get(oldest)!.close();
      this.cache.delete(oldest);
    }
  }

  private pumpDecodes() {
    while (
      !this.stopped &&
      this.activeDecodes < DECODE_CONCURRENCY &&
      this.decodeQueue.length
    ) {
      const frame = this.decodeQueue.shift()!;
      // Skip work the scroll has already moved past.
      if (Math.abs(frame - this.focus) > LOOKAHEAD * 3) continue;
      if (
        this.pinned.has(frame) ||
        this.cache.has(frame) ||
        this.decoding.has(frame)
      ) {
        continue;
      }
      this.activeDecodes++;
      this.decode(frame).finally(() => {
        this.activeDecodes--;
        this.pumpDecodes();
      });
    }
  }

  /**
   * Tell the loader where the viewer is, so it can decode ahead in the
   * direction of travel and release what is behind. Called once per rendered
   * frame — cheap, and does nothing when the window is already warm.
   */
  update(frame: number, direction: number) {
    if (this.stopped) return;
    this.focus = frame;
    if (direction !== 0) this.direction = direction > 0 ? 1 : -1;

    const ahead = this.direction > 0 ? LOOKAHEAD : LOOKBEHIND;
    const behind = this.direction > 0 ? LOOKBEHIND : LOOKAHEAD;
    const lo = Math.max(this.from, frame - behind);
    const hi = Math.min(this.to, frame + ahead);

    // Queue nearest-first so the most urgent frames decode soonest.
    const wanted: number[] = [];
    for (let i = lo; i <= hi; i++) {
      if (!this.pinned.has(i) && !this.cache.has(i) && !this.decoding.has(i)) {
        wanted.push(i);
      }
    }
    if (!wanted.length) return;
    wanted.sort((a, b) => Math.abs(a - frame) - Math.abs(b - frame));
    this.decodeQueue = wanted;
    this.pumpDecodes();
  }

  get isRevealable() {
    return this.loadedCount >= this.revealTarget;
  }

  /** The frame itself, if it happens to be decoded right now. */
  getExact(frame: number): ImageBitmap | null {
    const hit = this.pinned.get(frame) ?? this.cache.get(frame);
    if (hit && this.cache.has(frame)) {
      // Mark as most-recently-used.
      this.cache.delete(frame);
      this.cache.set(frame, hit);
    }
    return hit ?? null;
  }

  /**
   * The best available bitmap for a frame: the exact one if decoded, else the
   * closest decoded neighbour. Never returns nothing once the page is revealed,
   * because the pinned skeleton always has something within half a stride.
   *
   * Returns which frame it actually found, not just the pixels. The caller has
   * to know: drawing a stand-in without knowing its index made the canvas jump
   * between the pinned frames (1, 17, 33, …) during a fast scroll, because
   * nothing could tell whether the substitute was better or worse than what was
   * already on screen.
   */
  best(frame: number): { frame: number; bitmap: ImageBitmap } | null {
    const exact = this.getExact(frame);
    if (exact) return { frame, bitmap: exact };

    for (let offset = 1; offset <= this.count; offset++) {
      const before = frame - offset;
      if (before >= this.from) {
        const b = this.pinned.get(before) ?? this.cache.get(before);
        if (b) return { frame: before, bitmap: b };
      }
      const after = frame + offset;
      if (after <= this.to) {
        const a = this.pinned.get(after) ?? this.cache.get(after);
        if (a) return { frame: after, bitmap: a };
      }
    }
    return null;
  }
}
