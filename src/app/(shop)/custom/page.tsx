import type { Metadata } from "next";
import { CustomForm } from "@/components/custom-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Custom stickers",
  description: "Send us your artwork, logo or idea and we'll cut it into stickers in any shape.",
};

export default function CustomPage() {
  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Custom orders</p>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,7rem)]">
        Your design. <span className="text-lemon">Our cut.</span>
      </h1>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_28rem]">
        <div className="max-w-xl space-y-6 text-lg text-paper/75">
          <p>
            Send a drawing, a design file, a logo or just the idea. Die cut, kiss cut, circles, squares or any shape you have in
            mind.
          </p>
          <ol className="space-y-4">
            {[
              ["Send your idea", "Fill in the form. Add artwork if you have it."],
              ["We send a quote", "We reply with options and a price."],
              ["You approve", "We prepare the design for print and show you before cutting."],
              ["We print and cut", "Then collect it or we ship it to you."],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-4">
                <span className="label pt-1.5 text-lemon">0{i + 1}</span>
                <span>
                  <span className="block font-semibold text-paper">{t}</span>
                  {b}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-base">
            Prefer to chat?{" "}
            <a href={site.contact.instagramDm} className="text-lemon underline underline-offset-4" target="_blank" rel="noopener">
              DM us on Instagram
            </a>
            . Only send artwork you own or have permission to use.
          </p>
        </div>
        <CustomForm />
      </div>
    </section>
  );
}
