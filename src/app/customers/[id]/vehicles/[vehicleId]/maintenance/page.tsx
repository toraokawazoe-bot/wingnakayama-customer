import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, vehicles, ownerships, customers } from "@/db";
import { eq, isNull, and } from "drizzle-orm";
import { getActiveWorkItems, getMaintenanceRecordsByVehicleId } from "@/lib/queries/maintenance";
import { MaintenancePickerDialog } from "@/components/maintenance-picker-dialog";
import { MaintenanceHistory } from "@/components/maintenance-history";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string; vehicleId: string }>;
};

export default async function MaintenancePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id, vehicleId } = await params;
  const customerId = parseInt(id, 10);
  const vehicleIdNum = parseInt(vehicleId, 10);

  if (isNaN(customerId) || isNaN(vehicleIdNum)) {
    notFound();
  }

  const customerResult = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (customerResult.length === 0) {
    notFound();
  }

  const customer = customerResult[0];

  const ownershipResult = await db
    .select({ vehicleId: vehicles.id, maker: vehicles.maker, modelName: vehicles.modelName, plateNumber: vehicles.plateNumber, displacement: vehicles.displacement })
    .from(ownerships)
    .innerJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .where(
      and(
        eq(ownerships.customerId, customerId),
        eq(ownerships.vehicleId, vehicleIdNum),
        isNull(ownerships.endDate)
      )
    )
    .limit(1);

  if (ownershipResult.length === 0) {
    notFound();
  }

  const vehicle = ownershipResult[0];

  const [workItems, records] = await Promise.all([
    getActiveWorkItems(),
    getMaintenanceRecordsByVehicleId(vehicleIdNum),
  ]);

  const fullName = `${customer.lastName} ${customer.firstName}`;
  const vehicleLabel = [vehicle.maker, vehicle.modelName, vehicle.displacement ? `${vehicle.displacement}cc` : null, vehicle.plateNumber]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href={`/customers/${customerId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              カルテに戻る
            </Button>
          </Link>
          <div className="ml-2">
            <h1 className="text-lg font-semibold">{fullName} 様</h1>
            <p className="text-sm text-gray-500">{vehicleLabel}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">整備履歴</h2>
            <MaintenancePickerDialog
              vehicleId={vehicleIdNum}
              customerId={customerId}
              workItems={workItems}
              vehicleName={vehicleLabel}
            />
          </div>
          <MaintenanceHistory records={records} customerId={customerId} vehicleId={vehicleIdNum} />
        </section>
      </main>
    </div>
  );
}
