/**
 * Browser-compatible rate limiter using a token bucket algorithm.
 * Limits concurrent requests and enforces minimum delay between requests.
 */
export interface RateLimiterOptions {
  /** Max concurrent requests (default: 3) */
  maxConcurrent?: number;
  /** Minimum ms between request starts (default: 250) */
  minInterval?: number;
}

export class RateLimiter {
  private active = 0;
  private readonly maxConcurrent: number;
  private readonly minInterval: number;
  private lastRequestTime = 0;
  private queue: Array<() => void> = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 3;
    this.minInterval = options.minInterval ?? 250;
  }

  /** Wrap an async function so it respects rate limits */
  wrap<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
  ): (...args: TArgs) => Promise<TResult> {
    return (...args: TArgs) => this.schedule(() => fn(...args));
  }

  /** Schedule an async task through the rate limiter */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      const tryRun = () => {
        if (this.active >= this.maxConcurrent) {
          this.queue.push(tryRun);
          return;
        }

        const now = Date.now();
        const elapsed = now - this.lastRequestTime;

        if (elapsed < this.minInterval) {
          setTimeout(tryRun, this.minInterval - elapsed);
          return;
        }

        this.active++;
        this.lastRequestTime = Date.now();
        resolve();
      };

      tryRun();
    });
  }

  private release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

/** Default rate limiter instance for Bandcamp requests */
export const bandcampLimiter = new RateLimiter({
  maxConcurrent: 3,
  minInterval: 250,
});
