"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopSettingsSchema, type ShopSettingsFormData } from "@/lib/schemas/shop";
import { updateShopSettingsAction } from "@/app/settings/shop/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ShopSettings } from "@/lib/queries/shop";

type Props = {
  initialData: ShopSettings | null;
};

export function ShopSettingsForm({ initialData }: Props) {
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShopSettingsFormData>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      shopName: initialData?.shopName ?? "",
      ownerName: initialData?.ownerName ?? "",
      postalCode: initialData?.postalCode ?? "",
      address: initialData?.address ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      registrationNumber: initialData?.registrationNumber ?? "",
    },
  });

  const onSubmit = async (data: ShopSettingsFormData) => {
    setSubmitError(null);
    setSaved(false);
    const result = await updateShopSettingsAction(data);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="shopName">
          店舗名 <span className="text-red-600">*</span>
        </Label>
        <Input id="shopName" placeholder="例: ウイング中山" {...register("shopName")} />
        {errors.shopName && (
          <p className="text-sm text-red-600">{errors.shopName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerName">店主名</Label>
        <Input id="ownerName" placeholder="例: 山田 太郎" {...register("ownerName")} />
        {errors.ownerName && (
          <p className="text-sm text-red-600">{errors.ownerName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">電話番号</Label>
        <Input id="phone" placeholder="例: 096-123-4567" {...register("phone")} />
        {errors.phone && (
          <p className="text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="postalCode">郵便番号</Label>
        <Input
          id="postalCode"
          placeholder="例: 860-0001"
          className="max-w-[200px]"
          {...register("postalCode")}
        />
        {errors.postalCode && (
          <p className="text-sm text-red-600">{errors.postalCode.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">住所</Label>
        <Input id="address" placeholder="例: 熊本県熊本市中央区..." {...register("address")} />
        {errors.address && (
          <p className="text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          placeholder="例: info@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationNumber">
          適格請求書発行事業者登録番号
        </Label>
        <Input
          id="registrationNumber"
          placeholder="例: T1234567890123"
          className="max-w-[260px]"
          {...register("registrationNumber")}
        />
        <p className="text-xs text-gray-400">T + 13桁の数字</p>
        {errors.registrationNumber && (
          <p className="text-sm text-red-600">{errors.registrationNumber.message}</p>
        )}
      </div>

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {submitError}
        </div>
      )}

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          保存しました
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
