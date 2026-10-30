// AI sticker ideas: a customer describes an idea, Pollinations (free, no
// account) draws it, and the app shows the picture. The phone loads the image
// straight from Pollinations, so each phone gets its own free rate limit. When
// the customer wants it made, the server fetches the same picture again and
// keeps it as an upload for a custom request.
//
// The server builds every image URL from the idea text, kind and seed. It never
// fetches a URL the client sends.

export const IDEA_KINDS = ["sticker", "poster"] as const;
export type IdeaKind = (typeof IDEA_KINDS)[number];

export const IDEA_MIN = 3;
export const IDEA_MAX = 200;
const HOST = "https://image.pollinations.ai";

// Brands, franchises and characters we can't print, plus things we won't.
// Matched as whole words, case-insensitive. Not exhaustive: the shop still
// checks every request by hand before anything is printed.
const BLOCKED = [
  // brands
  "nike", "adidas", "puma", "gucci", "louis vuitton", "supreme", "apple logo", "coca cola", "coca-cola", "pepsi", "starbucks", "mcdonalds", "mcdonald's", "ferrari", "lamborghini", "bmw", "mercedes", "red bull", "monster energy", "playstation", "xbox", "nintendo",
  // franchises and studios
  "disney", "pixar", "marvel", "dc comics", "star wars", "harry potter", "hogwarts", "pokemon", "pokémon", "pikachu", "naruto", "one piece", "dragon ball", "goku", "demon slayer", "jujutsu kaisen", "attack on titan", "studio ghibli", "totoro", "spongebob", "mickey", "minnie", "hello kitty", "sanrio", "barbie", "minecraft", "fortnite", "among us", "batman", "superman", "spiderman", "spider-man", "iron man", "avengers", "simpsons", "peppa pig", "doraemon", "shinchan", "shin-chan", "chhota bheem", "f1",
  // not for us
  "nude", "naked", "nsfw", "sexy", "porn", "gore", "drugs", "weed", "cocaine", "nazi", "swastika",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BLOCKED_RE = new RegExp(`(^|[^\\p{L}\\p{N}])(${BLOCKED.map(escape).join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu");

export type IdeaCheck = { ok: true; idea: string } | { ok: false; error: string };

export function checkIdea(raw: unknown): IdeaCheck {
  if (typeof raw !== "string") return { ok: false, error: "Describe your idea." };
  const idea = raw.replace(/\s+/g, " ").trim();
  if (idea.length < IDEA_MIN) return { ok: false, error: "Describe your idea in a few words." };
  if (idea.length > IDEA_MAX) return { ok: false, error: `Keep it under ${IDEA_MAX} characters.` };
  if (/https?:\/\/|www\./i.test(idea)) return { ok: false, error: "Describe the idea in words, without links." };
  if (BLOCKED_RE.test(idea)) return { ok: false, error: "We can't make brands, logos or famous characters. Try your own idea." };
  return { ok: true, idea };
}

export function ideaPrompt(idea: string, kind: IdeaKind): string {
  return kind === "poster"
    ? `poster artwork of ${idea}, bold flat illustration, vibrant colours, clean composition, no text, no watermark`
    : `die-cut vinyl sticker of ${idea}, bold clean outline, thick white border, flat vector illustration, vibrant colours, centred on a plain light grey background, no text, no watermark`;
}

export function cleanSeed(seed: unknown): number {
  return typeof seed === "number" && Number.isInteger(seed) && seed >= 0 && seed < 1_000_000_000 ? seed : Math.floor(Math.random() * 1_000_000_000);
}

export function ideaImageUrl(idea: string, kind: IdeaKind, seed: number): string {
  const [w, h] = kind === "poster" ? [768, 1088] : [768, 768];
  const q = new URLSearchParams({ width: String(w), height: String(h), seed: String(seed), model: "flux", nologo: "true", safe: "true", private: "true", referrer: "stixnvibes.com" });
  return `${HOST}/prompt/${encodeURIComponent(ideaPrompt(idea, kind))}?${q}`;
}
