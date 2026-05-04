import Link from "next/link";
import type {
  OilChangeAlert,
  InspectionAlert,
  InsuranceAlert,
  InspectionExpiryAlert,
  DormantCustomerAlert,
} from "@/lib/queries/maintenance-alerts";
import { alertUrgencyToLevel, getUrgencyClass } from "@/lib/constants/icons";

type ActionItem = {
  id: string;
  sortKey: number;          // 0=critical, 1=warning, 2=notice
  customerId: number;
  customerName: string;
  vehicleLabel: string;
  alertType: "oil" | "inspection" | "insurance" | "expiry" | "dormant";
  alertTypeLabel: string;
  detail: string;
  urgency: "high" | "medium" | "low";
};

function toItems(
  oilAlerts: OilChangeAlert[],
  inspectionAlerts: InspectionAlert[],
  insuranceAlerts: InsuranceAlert[],
  expiryAlerts: InspectionExpiryAlert[],
  dormantAlerts: DormantCustomerAlert[],
): ActionItem[] {
  const items: ActionItem[] = [];
  const sortOrder = { high: 0, medium: 1, low: 2 };

  for (const a of oilAlerts) {
    const detail =
      a.prediction.stage === "predictive"
        ? `予測残り${a.prediction.predictedRemainingDays}日`
        : a.prediction.stage === "initial"
        ? `前回から${a.prediction.daysSinceLast}日`
        : "データなし";
    items.push({
      id: `oil-${a.vehicleId}`,
      sortKey: sortOrder[a.urgency],
      customerId: a.customerId,
      customerName: `${a.customerLastName} ${a.customerFirstName}`,
      vehicleLabel: [a.vehicleMaker, a.vehicleModelName, a.vehiclePlateNumber].filter(Boolean).join(" "),
      alertType: "oil",
      alertTypeLabel: "オイル",
      detail,
      urgency: a.urgency,
    });
  }

  for (const a of inspectionAlerts) {
    items.push({
      id: `insp-${a.vehicleId}`,
      sortKey: sortOrder[a.urgency],
      customerId: a.customerId,
      customerName: `${a.customerLastName} ${a.customerFirstName}`,
      vehicleLabel: [a.vehicleMaker, a.vehicleModelName, a.vehiclePlateNumber].filter(Boolean).join(" "),
      alertType: "inspection",
      alertTypeLabel: "点検",
      detail: a.lastInspectionAt ? `前回から${a.daysSinceLast}日` : "点検記録なし",
      urgency: a.urgency,
    });
  }

  for (const a of insuranceAlerts) {
    items.push({
      id: `ins-${a.vehicleId}`,
      sortKey: sortOrder[a.urgency],
      customerId: a.customerId,
      customerName: `${a.customerLastName} ${a.customerFirstName}`,
      vehicleLabel: [a.vehicleMaker, a.vehicleModelName, a.vehiclePlateNumber].filter(Boolean).join(" "),
      alertType: "insurance",
      alertTypeLabel: "自賠責",
      detail: `${a.endDate} まで（残${a.daysUntilExpiry}日）`,
      urgency: a.urgency,
    });
  }

  for (const a of expiryAlerts) {
    items.push({
      id: `exp-${a.vehicleId}`,
      sortKey: sortOrder[a.urgency],
      customerId: a.customerId,
      customerName: `${a.customerLastName} ${a.customerFirstName}`,
      vehicleLabel: [a.vehicleMaker, a.vehicleModelName, `${a.displacement}cc`, a.vehiclePlateNumber].filter(Boolean).join(" "),
      alertType: "expiry",
      alertTypeLabel: "車検",
      detail: `${a.expiryDate} まで（残${a.daysUntilExpiry}日）`,
      urgency: a.urgency,
    });
  }

  for (const a of dormantAlerts) {
    items.push({
      id: `dorm-${a.customerId}`,
      sortKey: sortOrder[a.urgency],
      customerId: a.customerId,
      customerName: `${a.customerLastName} ${a.customerFirstName}`,
      vehicleLabel: "",
      alertType: "dormant",
      alertTypeLabel: "未来店",
      detail: a.lastVisitAt ? `最終来店 ${a.lastVisitAt}（${a.daysSinceLast}日前）` : "来店記録なし",
      urgency: a.urgency,
    });
  }

  return items.sort((a, b) => a.sortKey - b.sortKey);
}

const TYPE_ICON: Record<string, string> = {
  oil: "🛢️",
  inspection: "📋",
  insurance: "🛡️",
  expiry: "🚗",
  dormant: "💤",
};

type Props = {
  oilAlerts: OilChangeAlert[];
  inspectionAlerts: InspectionAlert[];
  insuranceAlerts: InsuranceAlert[];
  expiryAlerts: InspectionExpiryAlert[];
  dormantAlerts: DormantCustomerAlert[];
};

export function ActionList({ oilAlerts, inspectionAlerts, insuranceAlerts, expiryAlerts, dormantAlerts }: Props) {
  const allItems = toItems(oilAlerts, inspectionAlerts, insuranceAlerts, expiryAlerts, dormantAlerts);
  const displayed = allItems.slice(0, 10);
  const remaining = allItems.length - displayed.length;
  const totalCount = allItems.length;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">対応が必要なお客さん</h2>
        {totalCount > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {totalCount}件
          </span>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          現在、対応が必要なお客さんはいません
        </div>
      ) : (
        <div className="divide-y">
          {displayed.map((item) => {
            const level = alertUrgencyToLevel(item.urgency);
            const cls = getUrgencyClass(level);
            return (
              <Link
                key={item.id}
                href={`/customers/${item.customerId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded border ${cls.badge} ${cls.border}`}>
                  {TYPE_ICON[item.alertType]} {item.alertTypeLabel}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">{item.customerName}</span>
                    {item.vehicleLabel && (
                      <span className="text-xs text-gray-500 truncate">{item.vehicleLabel}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
                </div>
                <span className="shrink-0 text-gray-300 text-xs">›</span>
              </Link>
            );
          })}
        </div>
      )}

      {remaining > 0 && (
        <div className="px-5 py-2 border-t text-center text-xs text-gray-400">
          他{remaining}件
        </div>
      )}
    </div>
  );
}
