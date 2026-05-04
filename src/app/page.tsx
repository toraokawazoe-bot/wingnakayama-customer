import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">バイク屋管理システム</h1>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                ログアウト
              </button>
            </form>
          </div>

          <div className="text-gray-700 mb-4">
            ようこそ、{session?.user?.name ?? "ユーザー"}さん
          </div>

          <div className="text-gray-500 text-sm">
            機能は順次追加予定です。
          </div>
        </div>
      </div>
    </div>
  );
}
