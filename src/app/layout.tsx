import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartProvider } from "@/context/cart-context";
import { StoreJsonLd } from "@/components/seo/json-ld";
import { WebVitalsReporter } from "@/components/seo/web-vitals-reporter";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { LiveChat } from "@/components/conversion/live-chat";
import { ExitIntentModal } from "@/components/conversion/exit-intent-modal";
import { siteConfig } from "@/lib/site-config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "stickers",
    "vinyl stickers",
    "posters",
    "spotify cards",
    "custom posters",
    "frames",
    "mystery packs",
    "anime stickers",
    "marvel stickers",
    "f1 stickers",
    "football stickers",
    "gaming stickers",
    "custom stickers india",
    "stix nvibes",
    "stixn vibes",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    creator: "@stixnvibes",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  category: "shopping",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <CartProvider>
            <StoreJsonLd />
            <WebVitalsReporter />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-premium focus:border focus:border-border"
            >
              Skip to content
            </a>
            <div className="relative flex min-h-dvh flex-col">
              <Navbar />
              <main id="main" className="relative flex-1">
                {children}
              </main>
              <Footer />
              <CartDrawer />
              <LiveChat />
              <ExitIntentModal />
            </div>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
