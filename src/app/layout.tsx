import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/rethink-foundation.scss";
import "@/styles/_reset.scss";
import "@/components/layout/breakpoint-hardgate.scss";
import BreakpointHardGate from "@/components/layout/BreakpointHardGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ready 2 Print",
  description: "All rights reserved.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <BreakpointHardGate />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
