/**
 * 郵便番号から住所情報を取得する
 * zipcloud API (https://zipcloud.ibsnet.co.jp/) を使用
 */

export type AddressLookupResult =
  | { ok: true; prefecture: string; city: string; town: string }
  | { ok: false; error: string };

export async function lookupAddressByPostalCode(
  postalCode: string
): Promise<AddressLookupResult> {
  // 数字以外を除去
  const normalized = postalCode.replace(/\D/g, "");

  if (normalized.length !== 7) {
    return { ok: false, error: "郵便番号は7桁の数字で入力してください" };
  }

  try {
    const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${normalized}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return { ok: false, error: "郵便番号検索に失敗しました" };
    }

    const data = await response.json();

    if (data.status !== 200 || !data.results || data.results.length === 0) {
      return { ok: false, error: "該当する住所が見つかりませんでした" };
    }

    const result = data.results[0];
    return {
      ok: true,
      prefecture: result.address1,
      city: result.address2,
      town: result.address3,
    };
  } catch (error) {
    console.error("[lookupAddressByPostalCode] failed:", error);
    return { ok: false, error: "通信エラーが発生しました" };
  }
}
