import type { Metadata } from "next";
import { CustomForm } from "@/components/custom/custom-form";
import { CUSTOM_KIND_OPTIONS } from "@/lib/custom-kinds";
import { getShopState } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Custom stickers and prints",
  description: "Send us your own design: stickers, sheets, posters, music cards or wall cards, any quantity. We reply with a price.",
};

export default async function CustomPage() {
  const { settings } = await getShopState();
  return (
    <section className="container-x max-w-4xl pt-10 md:pt-16">
      <p className="label text-mute">Custom</p>
      <h1 className="display mt-2 text-[clamp(3rem,9vw,6rem)] leading-[0.9]">Your design, made by us</h1>
      <p className="mt-4 max-w-xl text-lg text-paper/75">
        Logos, artwork, photos, a club&apos;s merch, a whole fest&apos;s stickers. Send the designs, tell us what you want, and we reply with a price.
      </p>
      <div className="mt-10">
        <CustomForm kinds={CUSTOM_KIND_OPTIONS} handle={settings.instagramHandle} />
      </div>
    </section>
  );
}
