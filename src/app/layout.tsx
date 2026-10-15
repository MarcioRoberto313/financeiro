import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
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
  title: { default: "Finanças", template: "%s · Finanças" },
  description: "Orçamento, DRE, metas e relatórios das suas finanças pessoais.",
  applicationName: "Finanças",
  appleWebApp: { capable: true, title: "Finanças", statusBarStyle: "default" },
  icons: { apple: "/pwa-icon/180" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
