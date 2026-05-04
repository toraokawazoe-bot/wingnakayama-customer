import Link from "next/link";
import { Droplet, ClipboardCheck, Shield, Car } from "lucide-react";

type Card = {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  hasHigh: boolean;
  anchor: string;
};

type Props = {
  oilCount: number;
  oilHigh: boolean;
  inspectionCount: number;
  inspectionHigh: boolean;
  insuranceCount: number;
  insuranceHigh: boolean;
  inspectionExpiryCount: number;
  inspectionExpiryHigh: boolean;
};

function SummaryCard({ label, icon, count, hasHigh, anchor }: Omit<Card, "key">) {
  const active = count > 0;
  const critical = active && hasHigh;

  const colorClass = critical
    ? "border-red-300 bg-red-50"
    : active
    ? "border-orange-300 bg-orange-50"
    : "border-gray-200 bg-white";

  const countClass = critical
    ? "text-red-700"
    : active
    ? "text-orange-700"
    : "text-gray-300";

  const iconClass = critical
    ? "text-red-500"
    : active
    ? "text-orange-500"
    : "text-gray-300";

  return (
    <Link
      href={`#${anchor}`}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-4 transition-all hover:shadow-sm ${colorClass}`}
    >
      <div className={iconClass}>{icon}</div>
      <div className={`text-3xl font-extrabold tabular-nums leading-none ${countClass}`}>{count}</div>
      <div className="text-xs font-medium text-gray-600 text-center">{label}</div>
    </Link>
  );
}

export function AlertSummaryCards({
  oilCount, oilHigh,
  inspectionCount, inspectionHigh,
  insuranceCount, insuranceHigh,
  inspectionExpiryCount, inspectionExpiryHigh,
}: Props) {
  const cards: Card[] = [
    { key: "oil", label: "オイル交換", icon: <Droplet className="w-6 h-6" />, count: oilCount, hasHigh: oilHigh, anchor: "alert-oil" },
    { key: "insp", label: "点検未実施", icon: <ClipboardCheck className="w-6 h-6" />, count: inspectionCount, hasHigh: inspectionHigh, anchor: "alert-inspection" },
    { key: "ins", label: "自賠責期限", icon: <Shield className="w-6 h-6" />, count: insuranceCount, hasHigh: insuranceHigh, anchor: "alert-insurance" },
    { key: "exp", label: "車検期限", icon: <Car className="w-6 h-6" />, count: inspectionExpiryCount, hasHigh: inspectionExpiryHigh, anchor: "alert-expiry" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ key, ...rest }) => <SummaryCard key={key} {...rest} />)}
    </div>
  );
}
