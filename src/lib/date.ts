// 日本標準時（JST, Asia/Tokyo）に統一した日付ユーティリティ。
// バイク屋の業務上、すべての日付は JST で扱う。UTC の `toISOString().slice(0,10)` は
// 深夜帯に1日ズレるバグの温床になるため使用しない。

const JST_TZ = "Asia/Tokyo";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: JST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 今日の日付を JST の YYYY-MM-DD で返す
export function todayJst(): string {
  return dateFmt.format(new Date());
}

// 今日から N 日後（負数なら過去）の日付を JST の YYYY-MM-DD で返す
export function daysFromTodayJst(days: number): string {
  return dateFmt.format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

// 任意の Date オブジェクトを JST の YYYY-MM-DD で返す
export function toJstDate(d: Date): string {
  return dateFmt.format(d);
}

// 2つの YYYY-MM-DD 文字列の日数差（later - earlier）。
// 双方を UTC midnight として解釈するので、TZ に依存せず正確。
export function daysBetween(earlier: string, later: string): number {
  const a = new Date(earlier + "T00:00:00Z").getTime();
  const b = new Date(later + "T00:00:00Z").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// 与えられた YYYY-MM-DD 文字列から今日（JST）までの経過日数
export function daysSinceJst(dateStr: string): number {
  return daysBetween(dateStr, todayJst());
}
