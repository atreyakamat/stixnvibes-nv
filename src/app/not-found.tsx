import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export default function NotFound() {
  return (
    <Container>
      <div className="grid min-h-[70vh] place-items-center py-20 text-center">
        <div>
          <p className="font-display text-7xl font-semibold brand-gradient-text md:text-9xl">404</p>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            This page went custom without you.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Either it was sticker-faded out of existence or the URL slipped. Let's get you back to vibes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="gradient" size="lg" className="shadow-glow">
              <Link href="/">Back home</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/shop">Browse shop</Link>
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
