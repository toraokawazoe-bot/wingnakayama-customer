import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCustomerById } from "@/lib/queries/customers";
import { CustomerForm } from "@/components/customer-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { CustomerFormData } from "@/lib/schemas/customer";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    notFound();
  }

  const customer = await getCustomerById(customerId);
  if (!customer) {
    notFound();
  }

  const fullName = `${customer.lastName} ${customer.firstName}`;

  const initialData: CustomerFormData = {
    lastName: customer.lastName,
    firstName: customer.firstName,
    lastNameKana: customer.lastNameKana ?? "",
    firstNameKana: customer.firstNameKana ?? "",
    postalCode: customer.postalCode ?? "",
    prefecture: (customer.prefecture ?? "") as CustomerFormData["prefecture"],
    city: customer.city ?? "",
    addressLine: customer.addressLine ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    birthday: customer.birthday ?? "",
    memo: customer.memo ?? "",
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
          <h1 className="text-lg font-semibold ml-2">{fullName} 様 - 情報編集</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <CustomerForm
            mode="edit"
            customerId={customerId}
            initialData={initialData}
          />
        </div>
      </main>
    </div>
  );
}
