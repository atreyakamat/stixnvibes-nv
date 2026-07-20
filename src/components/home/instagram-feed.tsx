"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { instagramPosts } from "@/lib/data/products";
import { siteConfig } from "@/lib/site-config";

export function InstagramFeed() {
  return (
    <section className="relative py-20 md:py-24 lg:py-28">
      <Container>
        <div className="flex flex-col items-end justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            align="left"
            kicker={
              <span className="inline-flex items-center gap-1.5">
                <Instagram className="size-3.5" /> @stixnvibes
              </span>
            }
            title={<>Tag us. <span className="brand-gradient-text">Get featured.</span></>}
            description="Wall setups, laptop stickers, gift reactions, mystery unpacks — we share the best ones weekly."
          />
          <Button asChild variant="outline" size="default">
            <Link href={siteConfig.social.instagram} target="_blank" rel="noreferrer noopener">
              <Instagram className="size-4" /> Follow
            </Link>
          </Button>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6"
        >
          {instagramPosts.map((post) => (
            <motion.a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noreferrer noopener"
              whileHover={{ scale: 1.04 }}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt={post.caption} className="size-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Instagram className="size-7 text-white" />
              </div>
              <p className="absolute bottom-2 left-3 right-3 truncate text-xs font-medium text-white">
                {post.caption}
              </p>
            </motion.a>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
