"use client";
import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background/5">
      <motion.h1
        className="text-5xl md:text-7xl font-bold text-primary mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Stickers, Posters & More
      </motion.h1>
      <motion.p
        className="text-lg md:text-xl text-foreground/80 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        Premium, playful, and fully customisable.
      </motion.p>
      <Link href="/shop" className="px-8 py-3 bg-primary text-background rounded-full shadow-lg hover:scale-105 transition-transform">
        Shop Now
      </Link>
      {/* Floating stickers (simple placeholder) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Could use Framer Motion particles here */}
      </div>
    </section>
  );
}
