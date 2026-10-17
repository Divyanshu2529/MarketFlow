import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketFlow",
  description: "AI-powered equity research platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="marketflow-theme"
          strategy="beforeInteractive"
        >
          {`
            (function () {
              try {
                if (
                  localStorage.getItem("marketflow-theme") === "dark"
                ) {
                  document.documentElement.classList.add("dark");
                }
              } catch (error) {}
            })();
          `}
        </Script>

        <ThemeInitializer />

        {children}
      </body>
    </html>
  );
}