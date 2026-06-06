import { NextResponse } from "next/server";
import { createAndUploadBackup } from "@/lib/backup";

// Vercel Cron から毎日呼ばれる自動バックアップ。
// CRON_SECRET が設定されていれば Vercel が Authorization: Bearer <CRON_SECRET> を付与する。
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await createAndUploadBackup();
    console.log(
      `[cron/backup] saved ${result.pathname} (${result.totalRows} rows, ${result.size} bytes, encrypted=${result.encrypted}, pruned=${result.prunedCount})`
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/backup] failed:", error);
    return NextResponse.json({ ok: false, error: "backup failed" }, { status: 500 });
  }
}
