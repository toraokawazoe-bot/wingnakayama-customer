import { z } from "zod";

export const partFormSchema = z.object({
  name: z.string().min(1, "部品名は必須です").max(200),
  category: z.string().max(100).optional().or(z.literal("")),
  sku: z.string().max(100).optional().or(z.literal("")),
  supplier: z.string().max(200).optional().or(z.literal("")),
  purchasePrice: z.coerce.number().int().min(0).optional().or(z.literal("")),
  sellingPrice: z.coerce.number().int().min(0).optional().or(z.literal("")),
  currentStock: z.coerce.number().int().min(0, "在庫数は0以上で入力してください"),
  minStock: z.coerce.number().int().min(0, "最低在庫は0以上で入力してください"),
  unit: z.string().min(1, "単位は必須です").max(20),
  isActive: z.boolean().default(true),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

export type PartFormData = z.output<typeof partFormSchema>;
export type PartFormInput = z.input<typeof partFormSchema>;
