import type { ProductType } from "@/lib/types";

// Ready-made sale campaigns. Picking one in Admin → Offers fills in a % off
// offer with its name, banner and dates; adjust anything before saving.
//
// Festivals that follow the Hindu calendar move every year, so their dates
// are listed per year. They're the usual published dates; double-check the
// year's calendar before you save.

export type CampaignPreset = {
  id: string;
  name: string;
  banner: string;
  percent: number;
  productType: ProductType | null;
  /** Festival day (YYYY-MM-DD, IST) for each year it's known. */
  dates: string[];
  /** The sale opens this many days before the day... */
  leadDays: number;
  /** ...and closes at the end of this many days after it. */
  trailDays: number;
};

const everyYear = (mmdd: string, from = 2026, to = 2030) => Array.from({ length: to - from + 1 }, (_, i) => `${from + i}-${mmdd}`);

export const CAMPAIGNS: CampaignPreset[] = [
  {
    id: "diwali",
    name: "Diwali sale: 15% off",
    banner: "Diwali sale: 15% off everything. Light up your laptop!",
    percent: 15,
    productType: null,
    dates: ["2026-11-08", "2027-10-29"],
    leadDays: 7,
    trailDays: 2,
  },
  {
    id: "christmas",
    name: "Christmas sale: 10% off",
    banner: "Christmas sale: 10% off everything. Stickers make great stocking fillers.",
    percent: 10,
    productType: null,
    dates: everyYear("12-25"),
    leadDays: 7,
    trailDays: 1,
  },
  {
    id: "new-year",
    name: "New Year sale: 15% off",
    banner: "New year, new laptop. 15% off everything till 3 Jan.",
    percent: 15,
    productType: null,
    dates: everyYear("01-01", 2027, 2031),
    leadDays: 4,
    trailDays: 2,
  },
  {
    id: "valentines",
    name: "Valentine's: 20% off music cards",
    banner: "Valentine's week: 20% off music cards. Dedicate a song.",
    percent: 20,
    productType: "music-card",
    dates: everyYear("02-14", 2027, 2031),
    leadDays: 7,
    trailDays: 0,
  },
  {
    id: "holi",
    name: "Holi sale: 10% off",
    banner: "Holi sale: 10% off everything. Waterproof stickers survive the colours.",
    percent: 10,
    productType: null,
    dates: ["2027-03-22"],
    leadDays: 5,
    trailDays: 1,
  },
  {
    id: "back-to-college",
    name: "Back to college: 15% off stickers",
    banner: "Back to college: 15% off stickers. Deck out your laptop for the new term.",
    percent: 15,
    productType: "sticker",
    dates: everyYear("06-25", 2027, 2031),
    leadDays: 10,
    trailDays: 20,
  },
  {
    id: "friendship-day",
    name: "Friendship Day: 15% off music cards",
    banner: "Friendship Day: 15% off music cards. Send your bestie a song.",
    percent: 15,
    productType: "music-card",
    // First Sunday of August.
    dates: ["2027-08-01", "2028-08-06", "2029-08-05"],
    leadDays: 5,
    trailDays: 0,
  },
  {
    id: "independence-day",
    name: "Independence Day: 15% off",
    banner: "Independence Day sale: 15% off everything.",
    percent: 15,
    productType: null,
    dates: everyYear("08-15", 2027, 2031),
    leadDays: 2,
    trailDays: 1,
  },
  {
    id: "ganesh-chaturthi",
    name: "Ganesh Chaturthi: 10% off",
    banner: "Ganpati Bappa Morya! 10% off everything this Chaturthi.",
    percent: 10,
    productType: null,
    dates: ["2027-09-04"],
    leadDays: 5,
    trailDays: 5,
  },
  {
    id: "navratri",
    name: "Navratri: 10% off",
    banner: "Navratri sale: 10% off everything for nine nights.",
    percent: 10,
    productType: null,
    dates: ["2027-09-30"],
    leadDays: 1,
    trailDays: 9,
  },
];

const DAY = 24 * 60 * 60 * 1000;
const IST = "+05:30";

/** The next window of a campaign that hasn't ended yet, as ISO times. */
export function nextWindow(c: CampaignPreset, now: Date = new Date()): { day: string; startsAt: string; endsAt: string } | null {
  for (const day of [...c.dates].sort()) {
    const midnight = Date.parse(`${day}T00:00:00${IST}`);
    const startsAt = new Date(midnight - c.leadDays * DAY).toISOString();
    const endsAt = new Date(midnight + (c.trailDays + 1) * DAY).toISOString();
    if (Date.parse(endsAt) > now.getTime()) return { day, startsAt, endsAt };
  }
  return null;
}
