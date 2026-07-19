import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import Navbar from '@/components/ui/navbar';
import { DefaultSeo } from 'next-seo';
import seoConfig from '../../next-seo.config';
import { CartProvider } from '@/context/CartContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Stix N Vibes',
  description: 'Premium stickers, posters, and custom merch.',
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#111111' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <DefaultSeo {...seoConfig} />
          <CartProvider><Navbar /></CartProvider>
          <main className="flex-1 container mx-auto px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
