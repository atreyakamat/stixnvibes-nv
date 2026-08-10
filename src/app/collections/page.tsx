import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { CollectionService } from "@/lib/services/collection-service";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collectionService = new CollectionService();
  const collections = await collectionService.getCollections();

  return (
    <main className="min-h-screen pt-24 pb-16">
      <Section>
        <Container>
          <SectionHeader
            title="All Collections"
            description="Explore our curated sets of stickers, posters, and cards."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col, i) => (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 p-6 shadow-premium transition-transform hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow to-orange-400 opacity-20 transition-opacity group-hover:opacity-40" />
                <div className="relative z-10">
                  <h3 className="font-display text-2xl font-bold text-white group-hover:text-brand-yellow transition-colors">
                    {col.name}
                  </h3>
                  {col.description && (
                    <p className="mt-2 text-sm text-slate-300">
                      {col.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
