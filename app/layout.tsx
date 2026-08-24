import localFont from "next/font/local";
import type { Metadata, Viewport } from "next";
import { BRAND_NAME, TUTOR_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME}: private IB tutoring with ${TUTOR_NAME}`,
  description: `Weekly modules, gated practice, and clinics for ${TUTOR_NAME}'s IB Chemistry students. Access by invitation.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0061ef",
};

// Plus Jakarta Sans (DESIGN.md §2, §9 #25), vendored under OFL and served
// from our own origin: next/font/local emits the @font-face and copies the
// files into the build, so a page load makes zero third-party requests.
// One variable file per subset (weights 200 to 800), each pinned to the
// unicode-range Google publishes for it, so a Latin-Extended name pulls the
// second file and plain English pages never download it.
const jakarta = localFont({
  src: "../assets/fonts/plus-jakarta-sans/PlusJakartaSans-latin.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

const jakartaExt = localFont({
  src: "../assets/fonts/plus-jakarta-sans/PlusJakartaSans-latin-ext.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta-ext",
  // The metric-adjusted Arial stand-in belongs to the primary subset only:
  // two of them in one family list would just duplicate the same fallback.
  adjustFontFallback: false,
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${jakarta.variable} ${jakartaExt.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
