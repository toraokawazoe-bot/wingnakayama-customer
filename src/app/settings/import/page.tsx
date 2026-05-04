"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { importCustomersAction, type CustomerImportRecord } from "./actions";
import { ChevronLeft, Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// DBカラムとその日本語ラベル
const DB_COLUMNS = [
  { key: "lastName", label: "姓", required: true },
  { key: "firstName", label: "名", required: true },
  { key: "lastNameKana", label: "セイ（カタカナ）", required: false },
  { key: "firstNameKana", label: "メイ（カタカナ）", required: false },
  { key: "postalCode", label: "郵便番号", required: false },
  { key: "prefecture", label: "都道府県", required: false },
  { key: "city", label: "市区町村", required: false },
  { key: "addressLine", label: "以降の住所", required: false },
  { key: "phone", label: "電話番号", required: false },
  { key: "email", label: "メール", required: false },
  { key: "birthday", label: "生年月日(YYYY-MM-DD)", required: false },
  { key: "memo", label: "メモ", required: false },
] as const;

type DbColumnKey = typeof DB_COLUMNS[number]["key"];

// CSVヘッダーからDBカラムを自動推測
function guessMapping(headers: string[]): Record<DbColumnKey, string> {
  const autoMap: Record<string, DbColumnKey> = {
    "姓": "lastName", "名": "firstName",
    "セイ": "lastNameKana", "メイ": "firstNameKana",
    "郵便番号": "postalCode", "都道府県": "prefecture",
    "市区町村": "city", "以降の住所": "addressLine",
    "電話番号": "phone", "電話": "phone",
    "メール": "email", "メールアドレス": "email",
    "生年月日": "birthday", "メモ": "memo", "備考": "memo",
    "last_name": "lastName", "first_name": "firstName",
    "last_name_kana": "lastNameKana", "first_name_kana": "firstNameKana",
    "postal_code": "postalCode", "phone": "phone", "email": "email",
    "birthday": "birthday", "memo": "memo",
  };

  const result = {} as Record<DbColumnKey, string>;
  for (const col of DB_COLUMNS) {
    result[col.key] = "";
  }
  for (const header of headers) {
    const mapped = autoMap[header];
    if (mapped) result[mapped] = header;
  }
  return result;
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvAllRows, setCsvAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<DbColumnKey, string>>({} as Record<DbColumnKey, string>);
  const [result, setResult] = useState<{ insertedCount: number; skippedCount: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (parsed) => {
        const rows = parsed.data as string[][];
        if (rows.length < 2) {
          toast.error("CSVにデータ行がありません");
          return;
        }
        const headers = rows[0];
        const dataRows = rows.slice(1);
        setCsvHeaders(headers);
        setCsvPreview(dataRows.slice(0, 10));
        setCsvAllRows(dataRows);
        setMapping(guessMapping(headers));
      },
    });
  };

  const buildRecords = (): CustomerImportRecord[] => {
    return csvAllRows.map((row) => {
      const obj: Record<string, string> = {};
      for (const col of DB_COLUMNS) {
        const csvCol = mapping[col.key];
        const idx = csvHeaders.indexOf(csvCol);
        obj[col.key] = idx >= 0 ? (row[idx] ?? "").trim() : "";
      }
      return obj as unknown as CustomerImportRecord;
    });
  };

  const missingRequired = DB_COLUMNS
    .filter((c) => c.required && !mapping[c.key])
    .map((c) => c.label);

  const handleImport = () => {
    if (missingRequired.length > 0) {
      toast.error(`必須列が未マッピング: ${missingRequired.join(", ")}`);
      return;
    }

    const records = buildRecords();
    startTransition(async () => {
      const res = await importCustomersAction(records);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult({ insertedCount: res.insertedCount, skippedCount: res.skippedCount });
      toast.success(`${res.insertedCount}件 取り込みました`);
      // Reset
      setCsvHeaders([]);
      setCsvPreview([]);
      setCsvAllRows([]);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">データ取り込み（顧客CSV）</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* サンプルCSV */}
        <section className="bg-white rounded-lg shadow-sm border p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">CSVフォーマット</p>
            <p className="text-xs text-gray-500 mt-0.5">
              サンプルCSVをダウンロードしてフォーマットを確認してください
            </p>
          </div>
          <a href="/sample-customers.csv" download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              サンプルCSV
            </Button>
          </a>
        </section>

        {/* ファイル選択 */}
        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" />
            CSVファイルを選択
          </h2>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </section>

        {csvHeaders.length > 0 && (
          <>
            {/* 列マッピング */}
            <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
              <h2 className="text-base font-semibold">列マッピング</h2>
              <p className="text-xs text-gray-500">
                CSVの各列を顧客データのどのフィールドに対応させるか設定します。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DB_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center gap-2 text-sm">
                    <label className="w-40 shrink-0 text-gray-700">
                      {col.label}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      value={mapping[col.key] ?? ""}
                      onChange={(e) =>
                        setMapping((prev) => ({ ...prev, [col.key]: e.target.value }))
                      }
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="">（マップしない）</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {missingRequired.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  必須列が未設定: {missingRequired.join(", ")}
                </div>
              )}
            </section>

            {/* プレビュー */}
            <section className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
              <h2 className="text-base font-semibold">
                プレビュー（先頭{csvPreview.length}件 / 全{csvAllRows.length}件）
              </h2>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {csvHeaders.map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-600 border-r last:border-r-0 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {csvHeaders.map((_, j) => (
                          <td key={j} className="px-2 py-1.5 border-r last:border-r-0 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                            {row[j] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 実行ボタン */}
            <section className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={isPending || missingRequired.length > 0}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isPending ? "取り込み中..." : `${csvAllRows.length}件を取り込む`}
              </Button>
            </section>
          </>
        )}

        {/* 完了メッセージ */}
        {result && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-semibold">取り込み完了</p>
              <p>
                {result.insertedCount}件 登録
                {result.skippedCount > 0 && ` / ${result.skippedCount}件 スキップ（バリデーション不合格）`}
              </p>
              <Link href="/customers" className="mt-2 inline-block text-green-700 underline text-xs">
                顧客一覧で確認する →
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
