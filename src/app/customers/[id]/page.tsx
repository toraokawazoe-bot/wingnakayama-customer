import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/queries/customers";
import { getVehiclesByCustomerId } from "@/lib/queries/vehicles";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, Trash2, Plus, Wrench } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    notFound();
  }

  const customer = await getCustomerById(customerId);

  if (!customer) {
    notFound();
  }

  const vehicleList = await getVehiclesByCustomerId(customerId);

  const fullName = `${customer.lastName} ${customer.firstName}`;
  const fullKana =
    customer.lastNameKana || customer.firstNameKana
      ? `${customer.lastNameKana ?? ""} ${customer.firstNameKana ?? ""}`.trim()
      : null;
  const fullAddress = [customer.prefecture, customer.city, customer.addressLine]
    .filter(Boolean)
    .join("");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">{fullName} 様</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* 基本情報 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">基本情報</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <Pencil className="w-4 h-4 mr-1" />
                編集
              </Button>
              <Button variant="outline" size="sm" disabled className="text-red-600">
                <Trash2 className="w-4 h-4 mr-1" />
                削除
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
            <dt className="text-gray-600">お名前</dt>
            <dd>{fullName}</dd>

            {fullKana && (
              <>
                <dt className="text-gray-600">フリガナ</dt>
                <dd>{fullKana}</dd>
              </>
            )}

            {customer.phone && (
              <>
                <dt className="text-gray-600">電話番号</dt>
                <dd>{customer.phone}</dd>
              </>
            )}

            {customer.email && (
              <>
                <dt className="text-gray-600">メールアドレス</dt>
                <dd>{customer.email}</dd>
              </>
            )}

            {(customer.postalCode || fullAddress) && (
              <>
                <dt className="text-gray-600">住所</dt>
                <dd>
                  {customer.postalCode && (
                    <div className="text-gray-500">〒{customer.postalCode}</div>
                  )}
                  {fullAddress}
                </dd>
              </>
            )}

            {customer.birthday && (
              <>
                <dt className="text-gray-600">生年月日</dt>
                <dd>{customer.birthday}</dd>
              </>
            )}

            <dt className="text-gray-600">登録日</dt>
            <dd>
              {customer.createdAt instanceof Date
                ? customer.createdAt.toLocaleDateString("ja-JP")
                : ""}
            </dd>
          </dl>

          {customer.memo && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-1">メモ</div>
              <div className="text-sm whitespace-pre-wrap">{customer.memo}</div>
            </div>
          )}
        </section>

        {/* 車両 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">車両</h2>
            <Link href={`/customers/${customerId}/vehicles/new`}>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                車両を追加
              </Button>
            </Link>
          </div>

          {vehicleList.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              車両は未登録です
            </div>
          ) : (
            <ul className="divide-y">
              {vehicleList.map((v) => (
                <li key={v.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{v.maker} {v.modelName}</span>
                      {v.displacement && (
                        <span className="ml-2 text-gray-500">{v.displacement}cc</span>
                      )}
                    </div>
                    {v.plateNumber && (
                      <span className="text-gray-600 font-mono">{v.plateNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-gray-400 text-xs">
                      {v.firstRegistrationDate && <span>初年度: {v.firstRegistrationDate} </span>}
                      {v.createdAt instanceof Date && (
                        <span>登録: {v.createdAt.toLocaleDateString("ja-JP")}</span>
                      )}
                    </div>
                    <Link href={`/customers/${customerId}/vehicles/${v.id}/maintenance`}>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        <Wrench className="w-3 h-3 mr-1" />
                        整備記録
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
