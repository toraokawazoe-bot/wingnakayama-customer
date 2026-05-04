import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMaintenanceRecordRaw } from "@/lib/queries/maintenance";
import { MaintenanceEditForm } from "@/components/maintenance-edit-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { db, vehicles, ownerships } from "@/db";
import { eq, isNull } from "drizzle-orm";

type PageProps = {
  params: Promise<{ recordId: string }>;
};

export default async function EditMaintenancePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { recordId } = await params;
  const id = parseInt(recordId, 10);

  if (isNaN(id)) {
    notFound();
  }

  const record = await getMaintenanceRecordRaw(id);
  if (!record) {
    notFound();
  }

  // 車両からカスタマーIDを取得（戻りリンク用）
  const ownershipRow = await db
    .select({ customerId: ownerships.customerId })
    .from(ownerships)
    .where(eq(ownerships.vehicleId, record.vehicleId) && isNull(ownerships.endDate))
    .limit(1);

  const customerId = ownershipRow[0]?.customerId;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link
            href={
              customerId
                ? `/customers/${customerId}/vehicles/${record.vehicleId}/maintenance`
                : "/"
            }
          >
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              整備記録に戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">整備記録 編集</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <MaintenanceEditForm
            recordId={id}
            customerId={customerId ?? null}
            vehicleId={record.vehicleId}
            initialData={{
              workName: record.workName,
              price: record.price,
              mileage: record.mileage ?? "",
              performedAt: record.performedAt,
              memo: record.memo ?? "",
            }}
          />
        </div>
      </main>
    </div>
  );
}
