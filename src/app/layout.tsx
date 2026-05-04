import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "バイク屋管理システム",
  description: "バイクショップ向け業務管理システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
