import { z } from "zod";

export const MAKERS = ["ホンダ", "ヤマハ", "スズキ", "カワサキ", "その他"] as const;
export const QUICK_DISPLACEMENTS = [50, 125, 250, 400] as const;
export const PURCHASE_SOURCES = ["own_sale", "other_shop", "used_purchase", "unknown"] as const;

export const vehicleFormSchema = z.object({
  maker: z
    .string()
    .min(1, "メーカーを選択または入力してください")
    .max(50, "メーカー名は50文字以内で入力してください"),
  modelName: z
    .string()
    .min(1, "車種名を入力してください")
    .max(100, "車種名は100文字以内で入力してください"),
  displacement: z.coerce
    .number()
    .int("整数で入力してください")
    .min(1, "排気量は1cc以上で入力してください")
    .max(2000, "排気量は2000cc以内で入力してください"),
  plateNumber: z
    .string()
    .min(1, "ナンバープレートを入力してください")
    .max(20, "ナンバープレートは20文字以内で入力してください"),
  frameNumber: z
    .string()
    .max(50, "車台番号は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  modelCode: z
    .string()
    .max(50, "型式は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  firstRegistrationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "初年度登録はYYYY-MM-DD形式で入力してください")
    .optional()
    .or(z.literal("")),
  engineModel: z
    .string()
    .max(50, "エンジン型式は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .max(50, "色は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  purchaseMileage: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "走行距離は0以上で入力してください")
    .optional()
    .or(z.literal("")),
  purchaseSource: z
    .enum(PURCHASE_SOURCES)
    .optional()
    .or(z.literal("")),
  memo: z
    .string()
    .max(1000, "メモは1000文字以内で入力してください")
    .optional()
    .or(z.literal("")),
});

export type VehicleFormData = z.output<typeof vehicleFormSchema>;
export type VehicleFormInput = z.input<typeof vehicleFormSchema>;
