import { Fragment } from "react";
import { parseMarkdown, type Inline } from "@/lib/markdown";

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.kind) {
          case "text":
            return <Fragment key={i}>{n.text}</Fragment>;
          case "strong":
            return (
              <strong key={i} className="font-semibold text-paper">
                <Inlines nodes={n.children} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <Inlines nodes={n.children} />
              </em>
            );
          case "code":
            return (
              <code key={i} className="rounded bg-paper/10 px-1.5 py-0.5 font-mono text-[0.9em]">
                {n.text}
              </code>
            );
          case "link": {
            const external = /^https?:/.test(n.href);
            return (
              <a key={i} href={n.href} className="text-lemon underline underline-offset-2" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <Inlines nodes={n.children} />
              </a>
            );
          }
        }
      })}
    </>
  );
}

/** Renders a blog post body. Safe for anything typed in the admin: see lib/markdown.ts. */
export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={`space-y-5 text-lg leading-relaxed text-paper/85 ${className}`}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading": {
            const H = `h${b.level}` as "h2" | "h3" | "h4";
            return (
              <H key={i} className={`${b.level === 2 ? "display pt-4 text-3xl md:text-4xl" : "pt-2 text-xl font-semibold"} text-paper`}>
                <Inlines nodes={b.children} />
              </H>
            );
          }
          case "paragraph":
            return (
              <p key={i}>
                <Inlines nodes={b.children} />
              </p>
            );
          case "list": {
            const L = b.ordered ? "ol" : "ul";
            return (
              <L key={i} className={`space-y-1.5 pl-6 ${b.ordered ? "list-decimal" : "list-disc"} marker:text-lemon`}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} />
                  </li>
                ))}
              </L>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-lemon pl-4 italic text-paper/75">
                <Inlines nodes={b.children} />
              </blockquote>
            );
          case "image":
            return (
              <figure key={i}>
                <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-2xl" />
                {b.alt && <figcaption className="mt-2 text-sm text-mute">{b.alt}</figcaption>}
              </figure>
            );
          case "rule":
            return <hr key={i} className="border-line" />;
        }
      })}
    </div>
  );
}
