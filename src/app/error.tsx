"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-x flex flex-1 flex-col justify-center py-24">
      <h1 className="display text-[clamp(3rem,9vw,6rem)]">Something came unstuck.</h1>
      <p className="mt-6 text-lg text-paper/75">Try again. If it keeps happening, message us on Instagram.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8 w-fit">
        Try again
      </button>
    </main>
  );
}
