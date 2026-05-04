import { z } from "zod";

export const workItemFormSchema = z.object({
  name: z.string().min(1, "作業名は必須です").max(100),
  category: z.string().max(50).optional().or(z.literal("")),
  defaultPrice: z.coerce.number().int().min(0, "金額は0以上で入力してください"),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type WorkItemFormData = z.output<typeof workItemFormSchema>;
export type WorkItemFormInput = z.input<typeof workItemFormSchema>;
