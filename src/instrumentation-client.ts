import * as Sentry from "@sentry/nextjs";

// クライアント側の Sentry 初期化。
// 個人情報を含むため Replay は デフォルトで無効。
// 必要なら NEXT_PUBLIC_SENTRY_REPLAY_ON=1 で有効化（ただし PII マスク必須）。
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // クライアント側で個人情報をマスク
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
