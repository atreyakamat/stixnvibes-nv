import type { Metadata } from "next";
import { normalizeCode, COUPON_CODE_RE } from "@/lib/pricing";
import { cleanSource } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Get the Stix N Vibes app",
  description: "Order stickers and posters in the Stix N Vibes app. Scan the stall QR to unlock your app-only offer.",
  alternates: { canonical: "/app" },
};

const APK = "https://github.com/atreyakamat/stix-app/releases/latest";

/** Where the app QR lands: open the app if it's installed, or get it. */
export default async function GetAppPage({ searchParams }: PageProps<"/app">) {
  const sp = await searchParams;
  const rawCode = normalizeCode(typeof sp.code === "string" ? sp.code : "");
  const code = COUPON_CODE_RE.test(rawCode) ? rawCode : "";
  const src = cleanSource(typeof sp.src === "string" ? sp.src : "") || "app-qr";
  const q = new URLSearchParams({ src });
  if (code) q.set("code", code);
  const deep = `stixnvibes://?${q}`;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-16 text-center">
      <h1 className="display text-4xl sm:text-5xl">Your offer is waiting in the app</h1>
      <p className="text-paper/70">
        Order from the Stix N Vibes app and your code is applied by itself. {code && <>Your code: <strong className="font-mono">{code}</strong>.</>}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a href={deep} className="btn btn-primary">
          Open in the app
        </a>
        <a href={APK} className="btn btn-ghost">
          Get the app (Android)
        </a>
      </div>
      <p className="text-xs text-paper/50">
        Installed it already? Tap &ldquo;Open in the app&rdquo;. The code only works for orders placed inside the app. On iPhone? Order on the website for now.
      </p>
    </div>
  );
}
