"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { rateLimit, clearRateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

function formatResetMinutes(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
}

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const headerList = await headers();
  const ip = getClientIp(headerList);
  const ipKey = `login:ip:${ip}`;
  const emailKey = `login:email:${email}`;

  const ipResult = rateLimit(ipKey, MAX_ATTEMPTS * 4, WINDOW_MS);
  const emailResult = rateLimit(emailKey, MAX_ATTEMPTS, WINDOW_MS);

  if (!ipResult.allowed || !emailResult.allowed) {
    const minutes = formatResetMinutes(
      Math.max(ipResult.resetAt, emailResult.resetAt)
    );
    return {
      error: `ログイン試行回数が上限に達しました。約${minutes}分後に再度お試しください。`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    clearRateLimit(emailKey);
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "メールアドレスまたはパスワードが正しくありません" };
        default:
          return { error: "ログインに失敗しました" };
      }
    }
    throw error;
  }
}
