import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCustomerById } from "@/lib/queries/customers";
import { getModelNameSuggestions } from "@/lib/queries/vehicles";
import { VehicleForm } from "@/components/vehicle-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { db, vehicles, ownerships } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import type { VehicleFormData } from "@/lib/schemas/vehicle";

type PageProps = {
  params: Promise<{ id: string; vehicleId: string }>;
};

export default async function EditVehiclePage({ params }: PageProps) {
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

  const customer = await getCustomerById(customerId);
  if (!customer) {
    notFound();
  }

  const vehicleRows = await db
    .select()
    .from(vehicles)
    .innerJoin(ownerships, eq(ownerships.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicles.id, vehicleIdNum),
        eq(ownerships.customerId, customerId),
        isNull(ownerships.endDate)
      )
    )
    .limit(1);

  if (vehicleRows.length === 0) {
    notFound();
  }

  const vehicle = vehicleRows[0].vehicles;
  const modelNameSuggestions = await getModelNameSuggestions();
  const fullName = `${customer.lastName} ${customer.firstName}`;

  const initialData: VehicleFormData = {
    maker: vehicle.maker,
    modelName: vehicle.modelName ?? "",
    displacement: vehicle.displacement,
    plateNumber: vehicle.plateNumber ?? "",
    frameNumber: vehicle.frameNumber ?? "",
    modelCode: vehicle.modelCode ?? "",
    firstRegistrationDate: vehicle.firstRegistrationDate ?? "",
    engineModel: vehicle.engineModel ?? "",
    color: vehicle.color ?? "",
    purchaseMileage: vehicle.purchaseMileage ?? "",
    purchaseSource: (vehicle.purchaseSource ?? "") as VehicleFormData["purchaseSource"],
    memo: vehicle.memo ?? "",
  };

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
          <h1 className="text-lg font-semibold">
            {fullName} 様 - 車両編集
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <VehicleForm
            mode="edit"
            customerId={customerId}
            vehicleId={vehicleIdNum}
            modelNameSuggestions={modelNameSuggestions}
            initialData={initialData}
          />
        </div>
      </main>
    </div>
  );
}
