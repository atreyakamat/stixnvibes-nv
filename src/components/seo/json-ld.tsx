import * as React from "react";

/**
 * Renders a JSON-LD structured-data blob.
 * Use for SEO rich results (Schema.org).
 */
export function JsonLd({ data, id }: { data: Record<string, unknown>; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Organisation / Store JSON-LD - site-wide.
 */
export function StoreJsonLd() {
  return (
    <JsonLd
      id="store-jsonld"
      data={{
        "@context": "https://schema.org",
        "@type": "Store",
        name: "Stix N Vibes",
        url: "https://stixnvibes.com",
        email: "hello@stixnvibes.com",
        image: "https://stixnvibes.com/og-image.png",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Bengaluru",
          addressCountry: "IN",
        },
        sameAs: [
          "https://instagram.com/stixnvibes",
          "https://twitter.com/stixnvibes",
          "https://youtube.com/@stixnvibes",
        ],
      }}
    />
  );
}

/**
 * Product JSON-LD - per product page.
 */
export function ProductJsonLd(props: {
  name: string;
  slug: string;
  image: string;
  description: string;
  priceRupees: number;
  compareAtRupees?: number;
  rating?: number;
  reviewCount?: number;
  reviews?: { author: string; rating: number; text?: string; date?: string }[];
}) {
  return (
    <JsonLd
      id={`product-jsonld-${props.slug}`}
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: props.name,
        slug: props.slug,
        image: [props.image],
        description: props.description,
        offers: {
          "@type": "Offer",
          url: `https://stixnvibes.com/shop/${props.slug}`,
          priceCurrency: "INR",
          price: props.priceRupees,
          ...(props.compareAtRupees ? { priceValidUntil: new Date(Date.now() + 30 * 86400_000).toISOString() } : {}),
          availability: "https://schema.org/InStock",
        },
        ...(typeof props.rating === "number" && props.rating > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: props.rating,
                reviewCount: props.reviewCount ?? 1,
              },
            }
          : {}),
        ...(props.reviews?.length
          ? {
              review: props.reviews.map((r) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.author },
                reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
                ...(r.text ? { reviewBody: r.text } : {}),
                ...(r.date ? { datePublished: r.date } : {}),
              })),
            }
          : {}),
      }}
    />
  );
}

/**
 * FAQ JSON-LD - per FAQ section or page.
 */
export function FaqJsonLd(props: { questions: { q: string; a: string }[]; id?: string }) {
  return (
    <JsonLd
      id={props.id ?? "faq-jsonld"}
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: props.questions.map((pair) => ({
          "@type": "Question",
          name: pair.q,
          acceptedAnswer: { "@type": "Answer", text: pair.a },
        })),
      }}
    />
  );
}

/**
 * BreadcrumbList JSON-LD - for navigation hierarchy.
 */
export function BreadcrumbJsonLd(props: { items: { name: string; url: string }[]; id?: string }) {
  return (
    <JsonLd
      id={props.id ?? "breadcrumb-jsonld"}
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: props.items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url.startsWith("http") ? item.url : `https://stixnvibes.com${item.url}`,
        })),
      }}
    />
  );
}

