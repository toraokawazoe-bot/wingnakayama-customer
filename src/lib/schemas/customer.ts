import { z } from "zod";

// 都道府県の型（後で定数ファイルに分離してもよい）
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

export const customerFormSchema = z.object({
  lastName: z
    .string()
    .min(1, "姓を入力してください")
    .max(50, "姓は50文字以内で入力してください"),
  firstName: z
    .string()
    .min(1, "名を入力してください")
    .max(50, "名は50文字以内で入力してください"),
  lastNameKana: z
    .string()
    .max(50, "セイは50文字以内で入力してください")
    .regex(/^[ァ-ヶー\s]*$/, "全角カタカナで入力してください")
    .optional()
    .or(z.literal("")),
  firstNameKana: z
    .string()
    .max(50, "メイは50文字以内で入力してください")
    .regex(/^[ァ-ヶー\s]*$/, "全角カタカナで入力してください")
    .optional()
    .or(z.literal("")),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号は7桁の数字で入力してください（ハイフンあり/なし）")
    .optional()
    .or(z.literal("")),
  prefecture: z
    .enum(PREFECTURES, { message: "都道府県を選択してください" })
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "市区町村は100文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  addressLine: z
    .string()
    .max(200, "それ以降の住所は200文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^[\d-]*$/, "電話番号は数字とハイフンのみで入力してください")
    .max(20, "電話番号は20文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .max(200, "メールアドレスは200文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日はYYYY-MM-DD形式で入力してください")
    .optional()
    .or(z.literal("")),
  memo: z
    .string()
    .max(1000, "メモは1000文字以内で入力してください")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

export { PREFECTURES };
