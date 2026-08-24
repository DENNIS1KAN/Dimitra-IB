import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumen: private IB tutoring with Dimitra Anglou",
  description:
    "Weekly modules, gated practice, and clinics for Dimitra Anglou's IB Chemistry students. Access by invitation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0061ef",
};

// Plus Jakarta Sans (DESIGN.md §2) loaded the way the reference mockup does
// (a stylesheet link with display=swap) so the build never depends on a
// network fetch; the fallback stack applies until it arrives (or offline).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this is the App Router root layout: it wraps every route, which is exactly what the rule asks for */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
