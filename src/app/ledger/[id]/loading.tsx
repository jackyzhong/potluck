// Shown while the group's data streams in (Next's loading.tsx convention).
// Neutral bg-surface cards and bg-surface-muted-2 bones match Round 2 Boards
// 55/56/63/64. Because loading.tsx streams before page.tsx resolves Supabase,
// header title/emoji stay as generic bones.

const bone = "bg-surface-muted-2 motion-safe:animate-pulse";

const ROW_WIDTHS = ["w-[40%]", "w-[75%]", "w-[60%]", "w-[55%]", "w-[45%]", "w-[70%]"];
const PHONE_WIDTHS = ["w-[45%]", "w-[80%]", "w-[65%]", "w-[50%]"];

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading the group"
      className="flex min-h-dvh flex-col bg-bg text-text"
    >
      {/* Phone header */}
      <div className="flex items-center gap-2 py-3 pl-1 pr-3 sm:hidden">
        <span className={`${bone} size-11 rounded-full`} />
        <span className={`${bone} size-6 rounded-full`} />
        <span className={`${bone} h-5 w-28 rounded-lg`} />
        <span className={`${bone} ml-auto h-11 w-[74px] rounded-pill`} />
        <span className={`${bone} h-11 w-[62px] rounded-pill`} />
      </div>

      {/* Desktop header */}
      <div className="hidden items-center gap-4 px-6 py-4 sm:flex">
        <div className="flex flex-1 items-center gap-2.5">
          <span className={`${bone} size-7 rounded-full`} />
          <span className={`${bone} h-6 w-36 rounded-lg`} />
        </div>
        <div className="flex gap-1 rounded-hero bg-surface p-1 shadow-card">
          <span className={`${bone} h-10 w-24 rounded-[20px]`} />
          <span className={`${bone} h-10 w-24 rounded-[20px]`} />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className={`${bone} h-11 w-[74px] rounded-pill`} />
          <span className={`${bone} h-11 w-32 rounded-pill`} />
          <span className={`${bone} h-11 w-36 rounded-pill`} />
          <span aria-hidden="true" className="mx-1 h-7 w-px bg-line-strong" />
          <span className={`${bone} h-11 w-28 rounded-pill`} />
        </div>
      </div>

      {/* Phone tabs */}
      <div className="mx-4 flex gap-1 rounded-[26px] bg-surface p-1 shadow-card sm:hidden">
        <span className={`${bone} h-11 flex-1 rounded-pill`} />
        <span className={`${bone} h-11 flex-1 rounded-pill`} />
      </div>

      {/* Main layout: desktop 2 columns, phone stacked */}
      <div className="flex flex-wrap items-start gap-4 px-4 pb-4 pt-4 sm:px-6 sm:pt-1">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col">
          {/* Summary row */}
          <div className="flex flex-wrap gap-4">
            <section
              aria-hidden="true"
              className="flex min-w-0 flex-[3_1_560px] flex-wrap items-center gap-x-6 gap-y-4 rounded-hero bg-surface px-4 pb-3.5 pt-5 shadow-card sm:p-5"
            >
              <div className="flex flex-[1_1_240px] flex-col gap-2">
                <span className={`${bone} block h-3.5 w-[90px] rounded-lg`} />
                <span className={`${bone} block h-[54px] w-[220px] max-w-full rounded-[14px] sm:h-14 sm:w-[240px]`} />
                <span className={`${bone} hidden h-[13px] w-[200px] rounded-lg sm:block`} />
              </div>
              <div className="grid min-w-0 flex-[2_1_360px] grid-cols-5 gap-1 sm:gap-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`${bone} block h-[88px] rounded-[14px] sm:h-24 sm:rounded-chip`} />
                ))}
              </div>
            </section>

            <section
              aria-hidden="true"
              className="hidden min-w-0 flex-[1_1_280px] flex-col justify-center gap-3 rounded-hero bg-surface p-5 shadow-card sm:flex"
            >
              <span className={`${bone} block h-[17px] w-[110px] rounded-lg`} />
              <span className={`${bone} block h-[13px] w-[160px] rounded-lg`} />
              <span className={`${bone} block h-3 w-full rounded-md`} />
              <span className={`${bone} block h-[13px] w-[70%] rounded-lg`} />
            </section>
          </div>

          {/* Desktop toolbar */}
          <div aria-hidden="true" className="hidden flex-wrap items-center gap-3 pb-3 pt-4 sm:flex">
            <span className="h-11 max-w-[360px] flex-[1_1_260px] rounded-pill bg-surface shadow-button" />
            <div className="flex gap-1.5">
              <span className={`${bone} h-11 w-[52px] rounded-pill`} />
              <span className={`${bone} h-11 w-[94px] rounded-pill`} />
              <span className={`${bone} h-11 w-[94px] rounded-pill`} />
              <span className={`${bone} h-11 w-[114px] rounded-pill`} />
            </div>
          </div>

          {/* Desktop table skeleton */}
          <div aria-hidden="true" className="hidden min-w-0 rounded-hero bg-surface px-2 shadow-card sm:block">
            <div className="flex h-[42px] items-center px-3">
              <span className={`${bone} block h-3 w-80 max-w-full rounded-lg`} />
            </div>
            {ROW_WIDTHS.map((widthClass, i) => (
              <div
                key={i}
                className="grid h-14 grid-cols-[56px_minmax(0,2fr)_minmax(0,1.2fr)_90px_90px_90px] items-center gap-6 border-t border-line-table-row px-3"
              >
                <span className={`${bone} block h-3.5 w-11 rounded-lg`} />
                <span className={`${bone} block h-3.5 ${widthClass} rounded-lg`} />
                <span className="flex items-center gap-2">
                  <span className={`${bone} block size-7 shrink-0 rounded-full`} />
                  <span className={`${bone} block h-3.5 w-[70px] rounded-lg`} />
                </span>
                <span className={`${bone} block h-3.5 w-full rounded-lg`} />
                <span className={`${bone} block h-3.5 w-full rounded-lg`} />
                <span className={`${bone} block h-3.5 w-full rounded-lg`} />
              </div>
            ))}
          </div>

          {/* Phone list skeleton */}
          <div aria-hidden="true" className="mt-4 rounded-card bg-surface px-3.5 shadow-card sm:hidden">
            {PHONE_WIDTHS.map((widthClass, i) => (
              <div
                key={i}
                className="grid h-16 grid-cols-[36px_minmax(0,1fr)_72px] items-center gap-3 border-t border-line first:border-t-0"
              >
                <span className={`${bone} block size-9 rounded-full`} />
                <span className="flex flex-col gap-1.5">
                  <span className={`${bone} block h-3.5 ${widthClass} rounded-lg`} />
                  <span className={`${bone} block h-3 w-[60%] rounded-lg`} />
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <span className={`${bone} block h-3.5 w-[72px] rounded-lg`} />
                  <span className={`${bone} block h-3 w-[56px] rounded-lg`} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop right panel skeleton */}
        <aside
          aria-hidden="true"
          className="hidden min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-hero bg-surface p-5 shadow-card sm:flex"
        >
          <span className={`${bone} block h-5 w-[60%] rounded-lg`} />
          <span className={`${bone} block h-[120px] w-full rounded-chip`} />
          <span className={`${bone} block h-3.5 w-[80%] rounded-lg`} />
        </aside>
      </div>

      {/* Desktop shortcut footer */}
      <footer aria-hidden="true" className="mt-auto hidden flex-wrap gap-5 px-6 pb-4 pt-3 sm:flex">
        <span className={`${bone} block h-3 w-28 rounded-lg`} />
        <span className={`${bone} block h-3 w-20 rounded-lg`} />
        <span className={`${bone} block h-3 w-24 rounded-lg`} />
        <span className={`${bone} block h-3 w-24 rounded-lg`} />
      </footer>

      {/* Phone sticky bottom bar */}
      <div aria-hidden="true" className="mt-auto flex gap-2.5 px-4 pb-5 pt-3 sm:hidden">
        <span className={`${bone} h-[52px] flex-1 rounded-pill`} />
        <span className={`${bone} h-[52px] flex-1 rounded-pill`} />
      </div>
    </div>
  );
}
