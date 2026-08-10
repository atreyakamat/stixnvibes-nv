import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { CategoryService } from "@/lib/services/category-service";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categoryService = new CategoryService();
  const categories = await categoryService.getCategories();

  return (
    <main className="min-h-screen pt-24 pb-16">
      <Section>
        <Container>
          <SectionHeader
            title="Shop by Category"
            description="Find exactly what you're looking for."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900 p-8 shadow-premium transition-all hover:-translate-y-1 hover:shadow-glow border border-white/5"
              >
                <span className="text-5xl">{cat.icon || "📦"}</span>
                <div className="text-center">
                  <h3 className="font-display text-2xl font-bold text-white group-hover:text-brand-yellow transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
