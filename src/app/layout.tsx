import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { PreferencesProvider } from "@/lib/preferences";
import { AuthProvider } from "@/lib/auth";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { LANDING } from "@/lib/landing";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.my-tsundoku.app"),
  title: "My Tsundoku",
  description: LANDING.fr.metaDescription,
  alternates: {
    canonical: "/",
    languages: { fr: "/", en: "/en", "x-default": "/" },
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "My Tsundoku",
    description: LANDING.fr.metaDescription,
    url: "https://www.my-tsundoku.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2D4A3E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${playfair.variable} ${inter.variable} font-sans antialiased bg-paper text-ink`}
      >
        <PreferencesProvider>
          <AuthProvider>
            <ServiceWorkerRegistrar />
            {children}
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
