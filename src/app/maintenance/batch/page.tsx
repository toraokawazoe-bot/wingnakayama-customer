import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getActiveWorkItems } from "@/lib/queries/maintenance";
import { BatchMaintenanceForm } from "@/components/batch-maintenance-form";

export default async function BatchMaintenancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const workItems = await getActiveWorkItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              ホーム
            </Button>
          </Link>
          <h1 className="text-lg font-bold">まとめて入力</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <BatchMaintenanceForm workItems={workItems} />
      </main>
    </div>
  );
}
