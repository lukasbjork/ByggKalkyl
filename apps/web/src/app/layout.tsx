import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Calculator } from "lucide-react";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ByggKalkyl",
  description:
    "Ladda upp projektunderlag och få ut en kalkyl: material, arbete, omkostnader och genomförandetid.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="border-b">
            <div className="container flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Calculator className="h-5 w-5" />
                <span>ByggKalkyl</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  Projekt
                </Link>
                <Link href="/prislista" className="hover:text-foreground">
                  Prislista
                </Link>
              </nav>
            </div>
          </header>
          <main className="container flex-1 py-8">{children}</main>
          <footer className="border-t py-6">
            <div className="container text-xs text-muted-foreground">
              ByggKalkyl – MVP. Priser och tidsnormer i seed-data är EXEMPELDATA,
              inte verkliga värden. AI-mängdning är förslag som måste granskas.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
