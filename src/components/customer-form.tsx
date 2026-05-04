"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  customerFormSchema,
  PREFECTURES,
  type CustomerFormData,
} from "@/lib/schemas/customer";
import { createCustomerAction } from "@/app/customers/new/actions";
import { lookupAddressByPostalCode } from "@/lib/postal-code";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CustomerForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      lastNameKana: "",
      firstNameKana: "",
      postalCode: "",
      prefecture: "",
      city: "",
      addressLine: "",
      phone: "",
      email: "",
      birthday: "",
      memo: "",
    },
  });

  const postalCode = watch("postalCode");
  const prefecture = watch("prefecture");

  const handleLookupAddress = async () => {
    setLookupError(null);
    if (!postalCode) {
      setLookupError("郵便番号を入力してください");
      return;
    }

    setIsLookingUp(true);
    const result = await lookupAddressByPostalCode(postalCode);
    setIsLookingUp(false);

    if (!result.ok) {
      setLookupError(result.error);
      return;
    }

    setValue("prefecture", result.prefecture, { shouldValidate: true });
    setValue("city", result.city + result.town, { shouldValidate: true });
  };

  const onSubmit = async (data: CustomerFormData) => {
    setSubmitError(null);
    const result = await createCustomerAction(data);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    router.push(`/customers/${result.customerId}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 名前 */}
      <div className="space-y-2">
        <Label>
          お名前 <span className="text-red-600">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input placeholder="姓" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>
          <div>
            <Input placeholder="名" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* フリガナ */}
      <div className="space-y-2">
        <Label>フリガナ</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input placeholder="セイ" {...register("lastNameKana")} />
            {errors.lastNameKana && (
              <p className="text-sm text-red-600 mt-1">{errors.lastNameKana.message}</p>
            )}
          </div>
          <div>
            <Input placeholder="メイ" {...register("firstNameKana")} />
            {errors.firstNameKana && (
              <p className="text-sm text-red-600 mt-1">{errors.firstNameKana.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* 電話番号 */}
      <div className="space-y-2">
        <Label htmlFor="phone">電話番号</Label>
        <Input
          id="phone"
          placeholder="090-1234-5678"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* 郵便番号 */}
      <div className="space-y-2">
        <Label htmlFor="postalCode">郵便番号</Label>
        <div className="flex gap-2">
          <Input
            id="postalCode"
            placeholder="123-4567"
            className="max-w-[200px]"
            {...register("postalCode")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleLookupAddress}
            disabled={isLookingUp}
          >
            {isLookingUp ? "取得中..." : "住所を取得"}
          </Button>
        </div>
        {errors.postalCode && (
          <p className="text-sm text-red-600">{errors.postalCode.message}</p>
        )}
        {lookupError && (
          <p className="text-sm text-red-600">{lookupError}</p>
        )}
      </div>

      {/* 住所 */}
      <div className="space-y-2">
        <Label>住所</Label>
        <div className="space-y-2">
          <Select
            value={prefecture || ""}
            onValueChange={(value) =>
              setValue("prefecture", value as typeof PREFECTURES[number], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="都道府県を選択" />
            </SelectTrigger>
            <SelectContent>
              {PREFECTURES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="市区町村" {...register("city")} />
          <Input placeholder="それ以降の住所" {...register("addressLine")} />
        </div>
        {errors.city && (
          <p className="text-sm text-red-600">{errors.city.message}</p>
        )}
        {errors.addressLine && (
          <p className="text-sm text-red-600">{errors.addressLine.message}</p>
        )}
      </div>

      {/* メールアドレス */}
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* 生年月日 */}
      <div className="space-y-2">
        <Label htmlFor="birthday">生年月日</Label>
        <Input
          id="birthday"
          type="date"
          className="max-w-[200px]"
          {...register("birthday")}
        />
        {errors.birthday && (
          <p className="text-sm text-red-600">{errors.birthday.message}</p>
        )}
      </div>

      {/* メモ */}
      <div className="space-y-2">
        <Label htmlFor="memo">メモ</Label>
        <Textarea
          id="memo"
          placeholder="自由メモ欄"
          rows={4}
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
