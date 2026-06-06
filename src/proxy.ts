import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = nextUrl.pathname.startsWith("/login");
  const isOnAuthApi = nextUrl.pathname.startsWith("/api/auth");
  const isOnCronApi = nextUrl.pathname.startsWith("/api/cron");

  // Auth.jsのAPI（/api/auth/*）は素通し
  if (isOnAuthApi) {
    return NextResponse.next();
  }

  // Cron API（/api/cron/*）はルート側で CRON_SECRET の Bearer 認証を行うため素通し
  if (isOnCronApi) {
    return NextResponse.next();
  }

  // ログインページはログイン済みなら / にリダイレクト
  if (isOnLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // それ以外のページは未ログインなら /login にリダイレクト
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // 静的ファイルと画像、Next.js内部ファイルは除外
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
