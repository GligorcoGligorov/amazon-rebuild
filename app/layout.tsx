import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Three voices, one job each (D36): serif for display, sans for reading, mono
// for numbers.
const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Almanac", template: "%s · Almanac" },
  description: "Everyday goods, well chosen. Clothing, shoes, watches, laptops and phones.",
};

/**
 * Shell only. The chrome lives in the route groups, because checkout
 * deliberately has almost none of it — see `(checkout)/layout.tsx` and D11.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
