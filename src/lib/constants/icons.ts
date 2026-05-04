import {
  Droplet,
  CircleDashed,
  Disc,
  Battery,
  ClipboardCheck,
  Calendar,
  Link,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  オイル: Droplet,
  タイヤ: CircleDashed,
  ブレーキ: Disc,
  電装: Battery,
  点検: ClipboardCheck,
  車検: Calendar,
  チェーン: Link,
};

export function getCategoryIcon(category: string | null | undefined): LucideIcon {
  if (!category) return Wrench;
  return CATEGORY_ICON_MAP[category] ?? Wrench;
}

export type UrgencyLevel = "critical" | "warning" | "notice" | "ok" | "neutral";

export const URGENCY_CLASSES: Record<UrgencyLevel, { bg: string; text: string; border: string; badge: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300", badge: "bg-red-100 text-red-700" },
  warning:  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", badge: "bg-orange-100 text-orange-700" },
  notice:   { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300", badge: "bg-yellow-100 text-yellow-700" },
  ok:       { bg: "bg-green-50", text: "text-green-700", border: "border-green-300", badge: "bg-green-100 text-green-700" },
  neutral:  { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", badge: "bg-gray-100 text-gray-600" },
};

export function getUrgencyClass(level: UrgencyLevel) {
  return URGENCY_CLASSES[level];
}

// 既存の "high"/"medium"/"low" を UrgencyLevel へマップ
export function alertUrgencyToLevel(urgency: "high" | "medium" | "low"): UrgencyLevel {
  if (urgency === "high") return "critical";
  if (urgency === "medium") return "warning";
  return "notice";
}
