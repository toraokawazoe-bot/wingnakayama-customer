"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerLightFormSchema, type CustomerLightFormData } from "@/lib/schemas/customer";
import { createCustomerLightAction } from "@/app/customers/new/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  initialLastName?: string;
  initialFirstName?: string;
  onClose: () => void;
};

export function CustomerLightForm({ initialLastName = "", initialFirstName = "", onClose }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerLightFormData>({
    resolver: zodResolver(customerLightFormSchema),
    defaultValues: {
      lastName: initialLastName,
      firstName: initialFirstName,
      phone: "",
      memo: "",
    },
  });

  const onSubmit = (data: CustomerLightFormData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createCustomerLightAction(data);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      onClose();
      router.push(`/customers/${result.customerId}`);
    });
  };

  return (
    <div className="bg-white border rounded-xl shadow-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-800">新規お客さんをすぐ登録</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="light-lastName" className="text-xs">
              姓 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="light-lastName"
              placeholder="田中"
              className="h-9 text-sm"
              {...register("lastName")}
              autoFocus
            />
            {errors.lastName && (
              <p className="text-xs text-red-600">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="light-firstName" className="text-xs">
              名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="light-firstName"
              placeholder="太郎"
              className="h-9 text-sm"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-xs text-red-600">{errors.firstName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="light-phone" className="text-xs">電話番号</Label>
          <Input
            id="light-phone"
            placeholder="090-1234-5678"
            className="h-9 text-sm"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="light-memo" className="text-xs">メモ</Label>
          <Input
            id="light-memo"
            placeholder="紹介など（任意）"
            className="h-9 text-sm"
            {...register("memo")}
          />
        </div>

        {serverError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {serverError}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={isPending} className="flex-1">
            {isPending ? "登録中..." : "登録してカルテへ"}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            キャンセル
          </button>
        </div>

        <div className="border-t pt-2">
          <Link
            href="/customers/new"
            className="text-xs text-blue-600 hover:underline"
            onClick={onClose}
          >
            もっと詳しく登録する（住所・生年月日など）→
          </Link>
        </div>
      </form>
    </div>
  );
}
