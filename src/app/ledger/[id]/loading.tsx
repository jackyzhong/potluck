// Shown while the group's data streams in (Next's loading.tsx convention). The
// shapes match the real page: header, tabs, the gradient hero with its share
// card, then the ledger rows. Server component, tokens only, and the pulse is
// off for people who ask for reduced motion.

const bone = "rounded-md bg-surface-muted motion-safe:animate-pulse";
const onGlowBone = "rounded-md bg-on-glow-tile motion-safe:animate-pulse";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading the group"
      className="flex min-h-dvh flex-col bg-bg text-text"
    >
      <div className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6">
        <span className={`${bone} size-11 rounded-full`} />
        <span className={`${bone} h-6 w-40`} />
        <span className={`${bone} ml-auto h-11 w-28 rounded-pill max-sm:hidden`} />
      </div>
      <div className="flex gap-2 px-4 pb-3 sm:px-6">
        <span className={`${bone} h-9 w-24 rounded-pill`} />
        <span className={`${bone} h-9 w-24 rounded-pill`} />
      </div>

      <div className="flex flex-wrap gap-4 px-4 pt-1 sm:px-6">
        <div className="min-w-0 flex-[3_1_560px] rounded-hero p-5 shadow-glow [background:var(--gradient-glow-compact)] sm:[background:var(--gradient-glow)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex min-h-[110px] flex-[1_1_240px] flex-col gap-2">
              <span className={`${onGlowBone} h-4 w-24`} />
              <span className={`${onGlowBone} h-12 w-52 max-w-full rounded-lg`} />
              <span className={`${onGlowBone} h-3 w-32`} />
            </div>
            <div className="grid min-w-0 flex-[2_1_360px] grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`${onGlowBone} h-[92px] rounded-chip`} />
              ))}
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-[1_1_280px] rounded-hero bg-surface p-5 shadow-card">
          <span className={`${bone} block h-4 w-28`} />
          <span className={`${bone} mt-4 block h-3 w-full rounded-pill`} />
          <span className={`${bone} mt-4 block h-3 w-40`} />
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-6">
        <div className="rounded-card bg-surface px-3.5 shadow-card sm:rounded-hero sm:px-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex min-h-16 items-center gap-3 border-b border-line py-2 last:border-b-0">
              <span className={`${bone} size-9 shrink-0 rounded-full`} />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={`${bone} h-4 w-1/2 max-w-64`} />
                <span className={`${bone} h-3 w-1/3 max-w-40`} />
              </span>
              <span className={`${bone} h-4 w-16`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
