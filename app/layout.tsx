import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeClient from "@/components/ThemeClient";
import LayoutWrapper from "@/components/LayoutWrapper";
import Toaster from "@/components/Toaster";
import Confirm from "@/components/Confirm";
import Info from "@/components/Info";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SDM & Hukum - Kanwil Kemenag NTB",
  description: "Sistem Informasi SDM & Hukum Kantor Wilayah Kementerian Agama Provinsi Nusa Tenggara Barat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="orange">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-dvh bg-base-100 text-base-content">
          <ThemeClient />
          <LayoutWrapper>{children}</LayoutWrapper>
          {/* Global UI helpers */}
          <Toaster />
          <Confirm />
          <Info />
        </div>
      </body>
    </html>
  );
}
