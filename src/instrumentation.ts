import * as Sentry from "@sentry/nextjs";

// Sentry の初期化。SENTRY_DSN が未設定なら no-op（Sentry は呼ばれない）。
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      // 個人情報を含む可能性のあるリクエストボディ・ヘッダーは送信しない
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      sendDefaultPii: false,
    });
  }
}

// Next.js 16 の Server Components / Server Actions のエラー捕捉
export const onRequestError = Sentry.captureRequestError;
