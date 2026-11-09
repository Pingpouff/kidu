/**
 * Serial queue of reminder announcements.
 *
 * Several tasks (of one or several children) can become overdue at the same
 * time. Announcements are played strictly one after the other — never two
 * voices or alerts on top of each other — with a short pause in between.
 * Pending announcements for the same child are merged, and each one is
 * re-validated right before it plays so a task done in the meantime is skipped.
 */

export interface Announcement {
  childId: string;
  taskKeys: string[];
}

export interface ReminderQueueDeps<A extends Announcement> {
  /** Returns the announcement restricted to tasks still overdue, or null to skip it. */
  revalidate: (announcement: A) => Promise<A | null>;
  /** Plays the announcement (banner, sound, voice); resolves when finished. */
  play: (announcement: A) => Promise<void>;
  /** Merges two announcements of the same child. */
  merge: (pending: A, incoming: A) => A;
  /** Called whenever the announcement being played changes (null when idle). */
  onCurrentChange?: (current: A | null) => void;
  /** Pause between two announcements, in ms. */
  gapMs?: number;
  wait?: (ms: number) => Promise<void>;
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ReminderQueue<A extends Announcement> {
  private pending: A[] = [];
  private running = false;
  private stopped = false;

  constructor(private readonly deps: ReminderQueueDeps<A>) {}

  get size(): number {
    return this.pending.length;
  }

  get isRunning(): boolean {
    return this.running;
  }

  enqueue(announcement: A) {
    if (this.stopped) return;
    const index = this.pending.findIndex((p) => p.childId === announcement.childId);
    if (index >= 0) {
      this.pending[index] = this.deps.merge(this.pending[index], announcement);
    } else {
      this.pending.push(announcement);
    }
    void this.run();
  }

  /** Drops pending announcements (the one playing finishes). */
  clear() {
    this.pending = [];
  }

  /** Stops accepting announcements (e.g. component unmounted). */
  stop() {
    this.stopped = true;
    this.pending = [];
  }

  /** Accepts announcements again after stop() (React StrictMode remounts effects). */
  resume() {
    this.stopped = false;
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    const wait = this.deps.wait ?? defaultWait;
    try {
      while (this.pending.length > 0 && !this.stopped) {
        const next = this.pending.shift()!;
        const fresh = await this.deps.revalidate(next);
        if (!fresh || fresh.taskKeys.length === 0) continue;

        this.deps.onCurrentChange?.(fresh);
        try {
          await this.deps.play(fresh);
        } catch (err) {
          console.error('Reminder announcement failed:', err);
        }
        this.deps.onCurrentChange?.(null);
        if (this.pending.length > 0) await wait(this.deps.gapMs ?? 1500);
      }
    } finally {
      this.running = false;
    }
  }
}
