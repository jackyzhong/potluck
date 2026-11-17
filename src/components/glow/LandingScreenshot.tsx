/* eslint-disable @next/next/no-img-element */

export type LandingScreenshotName = "laptop" | "phone" | "hero" | "composer" | "plan" | "viewer";

/**
 * Renders both light and dark captures of the same screenshot so CSS
 * (`[data-theme]` / `prefers-color-scheme`) toggles the visible frame without
 * hydration flash.
 */
export function LandingScreenshot({
  name,
  alt,
  width,
  height,
  priority = false,
  className = ""
}: {
  name: LandingScreenshotName;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  const shared = `w-full object-cover object-top ${className}`;
  const loading = priority ? "eager" : "lazy";
  const decoding = priority ? "sync" : "async";
  const fetchPriority = priority ? "high" : undefined;

  return (
    <>
      <img
        src={`/screenshots/${name}-light.png`}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        className={`landing-shot-light ${shared}`}
      />
      <img
        src={`/screenshots/${name}-dark.png`}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        className={`landing-shot-dark ${shared}`}
      />
    </>
  );
}
