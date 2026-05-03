import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as readline from "readline";
import * as crypto from "crypto";

async function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function questionSecret(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const input: string[] = [];

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (char: string) => {
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input.join(""));
      } else if (char === "") {
        process.stdout.write("\n");
        process.exit(1);
      } else if (char === "") {
        if (input.length > 0) {
          input.pop();
          process.stdout.write("\b \b");
        }
      } else {
        input.push(char);
        process.stdout.write("*");
      }
    };

    process.stdin.on("data", onData);
  });
}

(async () => {
  const { db, users } = await import("../src/db/index");
  const { eq } = await import("drizzle-orm");
  const bcrypt = await import("bcryptjs");

  console.log("=== 初期オーナーアカウント作成 ===\n");

  const email = (await question("メールアドレス: ")).trim();
  if (!email) {
    console.error("エラー: メールアドレスを入力してください");
    process.exit(1);
  }

  const password = await questionSecret("パスワード: ");
  if (password.length < 8) {
    console.error("エラー: パスワードは8文字以上で入力してください");
    process.exit(1);
  }

  const displayName = (await question("表示名: ")).trim();
  if (!displayName) {
    console.error("エラー: 表示名を入力してください");
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    console.error(`エラー: メールアドレス ${email} は既に登録されています`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.default.hash(password, 10);

  await db.insert(users).values({
    id: crypto.randomUUID(),
    email,
    passwordHash,
    displayName,
    role: "owner",
  });

  console.log("\nオーナーアカウント作成完了");
  console.log(`メール: ${email}`);
  console.log("役割: owner");
})();
