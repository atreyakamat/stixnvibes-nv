import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `Shop | ${site.name}`, template: `%s | ${site.name} Shop` },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: `${site.name} Shop`,
    title: `Shop | ${site.name}`,
    description: site.description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Stix N Vibes stickers over a crowded stall in Goa" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#070707" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${bricolage.variable} ${geist.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script
          // Marks JS as available so reveal styles can hide content safely.
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
