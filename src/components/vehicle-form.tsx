"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  vehicleFormSchema,
  MAKERS,
  QUICK_DISPLACEMENTS,
  type VehicleFormData,
  type VehicleFormInput,
} from "@/lib/schemas/vehicle";
import { createVehicleAction } from "@/app/customers/[id]/vehicles/new/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  customerId: number;
  modelNameSuggestions: string[];
};

const PURCHASE_SOURCE_LABELS = {
  own_sale: "自社販売",
  other_shop: "他店購入",
  used_purchase: "中古購入",
  unknown: "不明",
} as const;

export function VehicleForm({ customerId, modelNameSuggestions }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [makerMode, setMakerMode] = useState<"preset" | "custom">("preset");
  const [selectedMaker, setSelectedMaker] = useState<string>("");
  const [displacementMode, setDisplacementMode] = useState<"preset" | "custom">("preset");
  const [selectedDisplacement, setSelectedDisplacement] = useState<number | null>(null);
  const [selectedPurchaseSource, setSelectedPurchaseSource] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormInput, unknown, VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      maker: "",
      modelName: "",
      displacement: undefined,
      plateNumber: "",
      frameNumber: "",
      modelCode: "",
      firstRegistrationDate: "",
      engineModel: "",
      color: "",
      purchaseMileage: "",
      purchaseSource: "",
      memo: "",
    },
  });

  const handleMakerSelect = (maker: string) => {
    if (maker === "その他") {
      setMakerMode("custom");
      setSelectedMaker("その他");
      setValue("maker", "");
    } else {
      setMakerMode("preset");
      setSelectedMaker(maker);
      setValue("maker", maker, { shouldValidate: true });
    }
  };

  const handleDisplacementSelect = (cc: number) => {
    setDisplacementMode("preset");
    setSelectedDisplacement(cc);
    setValue("displacement", cc, { shouldValidate: true });
  };

  const onSubmit = async (data: VehicleFormData) => {
    setSubmitError(null);
    const result = await createVehicleAction(customerId, data);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    router.push(`/customers/${customerId}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* メーカー */}
      <div className="space-y-2">
        <Label>
          メーカー <span className="text-red-600">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {MAKERS.map((m) => (
            <Button
              key={m}
              type="button"
              variant={selectedMaker === m ? "default" : "outline"}
              onClick={() => handleMakerSelect(m)}
            >
              {m}
            </Button>
          ))}
        </div>
        {makerMode === "custom" && (
          <Input
            placeholder="メーカー名を入力"
            {...register("maker")}
            autoFocus
          />
        )}
        {errors.maker && (
          <p className="text-sm text-red-600">{errors.maker.message}</p>
        )}
      </div>

      {/* 車種名 */}
      <div className="space-y-2">
        <Label htmlFor="modelName">
          車種名 <span className="text-red-600">*</span>
        </Label>
        <Input
          id="modelName"
          placeholder="例: スーパーカブ50"
          list="model-name-suggestions"
          {...register("modelName")}
        />
        <datalist id="model-name-suggestions">
          {modelNameSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {errors.modelName && (
          <p className="text-sm text-red-600">{errors.modelName.message}</p>
        )}
      </div>

      {/* 排気量 */}
      <div className="space-y-2">
        <Label>
          排気量(cc) <span className="text-red-600">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_DISPLACEMENTS.map((cc) => (
            <Button
              key={cc}
              type="button"
              variant={selectedDisplacement === cc && displacementMode === "preset" ? "default" : "outline"}
              onClick={() => handleDisplacementSelect(cc)}
            >
              {cc}cc
            </Button>
          ))}
          <Button
            type="button"
            variant={displacementMode === "custom" ? "default" : "outline"}
            onClick={() => {
              setDisplacementMode("custom");
              setSelectedDisplacement(null);
              setValue("displacement", undefined as unknown as number);
            }}
          >
            その他
          </Button>
        </div>
        {displacementMode === "custom" && (
          <Input
            type="number"
            placeholder="排気量を入力"
            className="max-w-[160px]"
            {...register("displacement")}
            autoFocus
          />
        )}
        {errors.displacement && (
          <p className="text-sm text-red-600">{errors.displacement.message}</p>
        )}
      </div>

      {/* ナンバープレート */}
      <div className="space-y-2">
        <Label htmlFor="plateNumber">
          ナンバープレート <span className="text-red-600">*</span>
        </Label>
        <Input
          id="plateNumber"
          placeholder="例: 熊本 あ 12-34"
          {...register("plateNumber")}
        />
        {errors.plateNumber && (
          <p className="text-sm text-red-600">{errors.plateNumber.message}</p>
        )}
      </div>

      {/* 初年度登録 */}
      <div className="space-y-2">
        <Label htmlFor="firstRegistrationDate">初年度登録</Label>
        <Input
          id="firstRegistrationDate"
          type="date"
          className="max-w-[200px]"
          {...register("firstRegistrationDate")}
        />
        {errors.firstRegistrationDate && (
          <p className="text-sm text-red-600">{errors.firstRegistrationDate.message}</p>
        )}
      </div>

      {/* 車台番号 */}
      <div className="space-y-2">
        <Label htmlFor="frameNumber">車台番号</Label>
        <Input
          id="frameNumber"
          placeholder="例: JA44-1000001"
          {...register("frameNumber")}
        />
        {errors.frameNumber && (
          <p className="text-sm text-red-600">{errors.frameNumber.message}</p>
        )}
      </div>

      {/* 型式 */}
      <div className="space-y-2">
        <Label htmlFor="modelCode">型式</Label>
        <Input
          id="modelCode"
          placeholder="例: JA44"
          {...register("modelCode")}
        />
        {errors.modelCode && (
          <p className="text-sm text-red-600">{errors.modelCode.message}</p>
        )}
      </div>

      {/* 色 */}
      <div className="space-y-2">
        <Label htmlFor="color">色</Label>
        <Input id="color" placeholder="例: パールホワイト" {...register("color")} />
        {errors.color && (
          <p className="text-sm text-red-600">{errors.color.message}</p>
        )}
      </div>

      {/* エンジン型式 */}
      <div className="space-y-2">
        <Label htmlFor="engineModel">エンジン型式</Label>
        <Input id="engineModel" placeholder="例: JA44E" {...register("engineModel")} />
        {errors.engineModel && (
          <p className="text-sm text-red-600">{errors.engineModel.message}</p>
        )}
      </div>

      {/* 仕入走行距離 */}
      <div className="space-y-2">
        <Label htmlFor="purchaseMileage">仕入時走行距離(km)</Label>
        <Input
          id="purchaseMileage"
          type="number"
          className="max-w-[160px]"
          placeholder="例: 5000"
          {...register("purchaseMileage")}
        />
        {errors.purchaseMileage && (
          <p className="text-sm text-red-600">{errors.purchaseMileage.message}</p>
        )}
      </div>

      {/* 仕入区分 */}
      <div className="space-y-2">
        <Label>仕入区分</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PURCHASE_SOURCE_LABELS) as [keyof typeof PURCHASE_SOURCE_LABELS, string][]).map(
            ([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={selectedPurchaseSource === value ? "default" : "outline"}
                onClick={() => {
                  setSelectedPurchaseSource(value);
                  setValue("purchaseSource", value, { shouldValidate: true });
                }}
              >
                {label}
              </Button>
            )
          )}
        </div>
        {errors.purchaseSource && (
          <p className="text-sm text-red-600">{errors.purchaseSource.message}</p>
        )}
      </div>

      {/* メモ */}
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

      {/* 送信エラー */}
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登録中..." : "登録"}
        </Button>
      </div>
    </form>
  );
}
