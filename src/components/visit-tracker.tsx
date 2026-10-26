"use client";

import { useEffect } from "react";
import { captureVisit } from "@/lib/track";

/** Counts the visit and remembers ?src= / ?code= from stall QRs and links. */
export function VisitTracker() {
  useEffect(() => captureVisit(), []);
  return null;
}
