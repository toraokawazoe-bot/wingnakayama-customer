import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/queries/customers";
import { getModelNameSuggestions } from "@/lib/queries/vehicles";
import { VehicleForm } from "@/components/vehicle-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewVehiclePage({ params }: PageProps) {
  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    notFound();
  }

  const customer = await getCustomerById(customerId);
  if (!customer) {
    notFound();
  }

  const modelNameSuggestions = await getModelNameSuggestions();
  const fullName = `${customer.lastName} ${customer.firstName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href={`/customers/${customerId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">
            車両登録: {fullName} 様
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <VehicleForm
            customerId={customerId}
            modelNameSuggestions={modelNameSuggestions}
          />
        </div>
      </main>
    </div>
  );
}
