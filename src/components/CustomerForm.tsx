"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CustomerData = {
  name: string;
  name_kana: string;
  phone: string;
  birthday: string;
  email: string;
  notes: string;
};

type Props = {
  initial?: Partial<CustomerData>;
  customerId?: number;
};

export default function CustomerForm({ initial, customerId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerData>({
    name: initial?.name || "",
    name_kana: initial?.name_kana || "",
    phone: initial?.phone || "",
    birthday: initial?.birthday || "",
    email: initial?.email || "",
    notes: initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("お客様名を入力してください"); return; }
    setSaving(true);
    setError("");

    const url = customerId ? `/api/customers/${customerId}` : "/api/customers";
    const method = customerId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/customers/${data.id}`);
    } else {
      const err = await res.json();
      setError(err.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-xl">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">お客様名 <span className="text-red-500">*</span></label>
        <input name="name" value={form.name} onChange={handleChange} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カナ</label>
        <input name="name_kana" value={form.name_kana} onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
        <input name="phone" value={form.phone} onChange={handleChange} type="tel"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
        <input name="birthday" value={form.birthday} onChange={handleChange} type="date"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
        <input name="email" value={form.email} onChange={handleChange} type="email"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium">
          {saving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
          キャンセル
        </button>
      </div>
    </form>
  );
}
