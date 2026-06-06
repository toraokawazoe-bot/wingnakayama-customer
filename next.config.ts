import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Next.js 16 / React 19 / next/image / sonner / react-hook-form を動かす最小CSP。
// nonce運用にする場合は middleware で生成する必要があるため、現状は 'unsafe-inline' を許容。
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "script-src": isProd
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "connect-src": [
    "'self'",
    "https://zipcloud.ibsnet.co.jp",
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
  ],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "upgrade-insecure-requests": [],
};

const csp = Object.entries(cspDirectives)
  .map(([k, v]) => (v.length === 0 ? k : `${k} ${v.join(" ")}`))
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
