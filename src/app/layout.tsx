import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "バイク屋管理システム",
  description: "バイクショップ顧客・整備管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-100">
        <Nav />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  );
}
