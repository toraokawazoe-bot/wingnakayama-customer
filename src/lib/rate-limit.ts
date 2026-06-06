/**
 * 軽量インメモリ・レートリミッタ。
 * 単一プロセス前提（Vercel Functions の同一インスタンス内のみ有効）。
 * 業務アプリの規模では十分だが、複数インスタンス分散環境では別実装が必要。
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const SWEEP_AFTER = 1000;
let opsSinceSweep = 0;

function sweep(now: number) {
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (++opsSinceSweep >= SWEEP_AFTER) {
    sweep(now);
    opsSinceSweep = 0;
  }

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    store.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
