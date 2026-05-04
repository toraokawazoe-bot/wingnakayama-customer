import { z } from "zod";

export const shopSettingsSchema = z.object({
  shopName: z.string().min(1, "店舗名を入力してください").max(100),
  ownerName: z.string().max(50).optional().or(z.literal("")),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号は7桁で入力してください")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[\d-]*$/, "電話番号は数字とハイフンのみ")
    .max(20)
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .max(200)
    .optional()
    .or(z.literal("")),
  registrationNumber: z.string().max(20).optional().or(z.literal("")),
});

export type ShopSettingsFormData = z.infer<typeof shopSettingsSchema>;
