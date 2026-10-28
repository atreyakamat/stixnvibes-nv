import { json, readJson } from "@/lib/api";
import { checkIdea, cleanSeed, IDEA_KINDS, ideaImageUrl, type IdeaKind } from "@/lib/idea";
import { rateLimit } from "@/lib/rate-limit";

// Turns a customer's idea into a Pollinations image link the app loads
// directly. Nothing is generated or stored here. See src/lib/idea.ts.
export async function POST(req: Request) {
  if (!(await rateLimit("app-idea", 25, 24 * 60 * 60_000))) return json({ error: "That's all the ideas for today. Come back tomorrow, or send us your idea as a custom request." }, 429);
  const body = (await readJson(req)) as { idea?: unknown; kind?: unknown; seed?: unknown } | null;
  const check = checkIdea(body?.idea);
  if (!check.ok) return json({ error: check.error }, 400);
  const kind: IdeaKind = (IDEA_KINDS as readonly unknown[]).includes(body?.kind) ? (body!.kind as IdeaKind) : "sticker";
  const seed = cleanSeed(body?.seed);
  return json({ idea: check.idea, kind, seed, url: ideaImageUrl(check.idea, kind, seed) });
}
