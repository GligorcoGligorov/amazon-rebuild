import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "8xstore", template: "%s · 8xstore" },
  description: "A rebuild of the core Amazon shopping experience.",
};

/**
 * Shell only. The chrome lives in the route groups, because checkout
 * deliberately has almost none of it — see `(checkout)/layout.tsx` and D11.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
