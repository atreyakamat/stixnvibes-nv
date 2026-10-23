import type { Metadata } from "next";
import { TrackForm } from "@/components/checkout/track-form";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Track order</p>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,7rem)]">Where&apos;s my order?</h1>
      <p className="mt-6 max-w-lg text-lg text-paper/75">
        Enter your order number (it starts with SNV-) and the phone number you ordered with.
      </p>
      <TrackForm />
    </section>
  );
}
