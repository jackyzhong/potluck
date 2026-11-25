import { notFound } from "next/navigation";
import { Gallery } from "./gallery";

export const metadata = { title: "Glow components", robots: { index: false, follow: false } };

// Gate on VERCEL_ENV, not NODE_ENV: Vercel Preview builds run with
// NODE_ENV=production too, and the owner reviews this page on the `glow`
// Preview. Only the real production deployment hides it. Locally VERCEL_ENV is unset.
export default function GlowGalleryPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <Gallery />;
}
