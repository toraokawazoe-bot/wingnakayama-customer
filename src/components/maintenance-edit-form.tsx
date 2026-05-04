"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { maintenanceRecordSchema, type MaintenanceRecordFormData, type MaintenanceRecordFormInput } from "@/lib/schemas/maintenance";
import { updateMaintenanceRecordAction } from "@/app/maintenance/[recordId]/edit/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  recordId: number;
  customerId: number | null;
  vehicleId: number;
  initialData: MaintenanceRecordFormData;
};

export function MaintenanceEditForm({ recordId, customerId, vehicleId, initialData }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceRecordFormInput, unknown, MaintenanceRecordFormData>({
    resolver: zodResolver(maintenanceRecordSchema),
    defaultValues: {
      workName: initialData.workName,
      price: initialData.price,
      mileage: initialData.mileage,
      performedAt: initialData.performedAt,
      memo: initialData.memo ?? "",
    },
  });

  const onSubmit = async (data: MaintenanceRecordFormData) => {
    setSubmitError(null);
    const result = await updateMaintenanceRecordAction(recordId, data);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    const returnUrl = customerId
      ? `/customers/${customerId}/vehicles/${vehicleId}/maintenance`
      : "/";
    router.push(returnUrl);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="workName">
          作業名 <span className="text-red-600">*</span>
        </Label>
        <Input id="workName" placeholder="例: オイル交換" {...register("workName")} />
        {errors.workName && (
          <p className="text-sm text-red-600">{errors.workName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">
          金額（円） <span className="text-red-600">*</span>
        </Label>
        <Input
          id="price"
          type="number"
          className="max-w-[200px]"
          placeholder="例: 1500"
          {...register("price")}
        />
        {errors.price && (
          <p className="text-sm text-red-600">{errors.price.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="performedAt">
          作業日 <span className="text-red-600">*</span>
        </Label>
        <Input
          id="performedAt"
          type="date"
          className="max-w-[200px]"
          {...register("performedAt")}
        />
        {errors.performedAt && (
          <p className="text-sm text-red-600">{errors.performedAt.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mileage">走行距離（km）</Label>
        <Input
          id="mileage"
          type="number"
          className="max-w-[200px]"
          placeholder="例: 12500"
          {...register("mileage")}
        />
        {errors.mileage && (
          <p className="text-sm text-red-600">{errors.mileage.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">メモ</Label>
        <Textarea
          id="memo"
          placeholder="自由メモ欄"
          rows={3}
          {...register("memo")}
        />
        {errors.memo && (
          <p className="text-sm text-red-600">{errors.memo.message}</p>
        )}
      </div>

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "更新中..." : "更新"}
        </Button>
      </div>
    </form>
  );
}
