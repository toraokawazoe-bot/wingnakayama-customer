import { z } from "zod";

export const maintenanceRecordSchema = z.object({
  workName: z.string().min(1, "作業名を入力してください").max(200),
  price: z.coerce.number().int("整数で入力してください").min(0, "金額は0以上で入力してください"),
  mileage: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "走行距離は0以上で入力してください")
    .optional()
    .or(z.literal("")),
  performedAt: z
    .string()
    .min(1, "作業日を入力してください")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

export type MaintenanceRecordFormData = z.output<typeof maintenanceRecordSchema>;
export type MaintenanceRecordFormInput = z.input<typeof maintenanceRecordSchema>;
