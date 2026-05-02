"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ダッシュボード" },
  { href: "/customers", label: "顧客管理" },
  { href: "/bikes", label: "車両管理" },
  { href: "/maintenance", label: "整備記録" },
  { href: "/invoices", label: "請求書" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-1 h-14">
          <span className="text-lg font-bold mr-6 text-orange-400 whitespace-nowrap">🏍️ バイク屋管理</span>
          <nav className="flex gap-1">
            {links.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    active
                      ? "bg-orange-500 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
