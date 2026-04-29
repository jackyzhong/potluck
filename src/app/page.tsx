import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation / Header */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="text-2xl">🍲</span>
          <span>Potluck</span>
        </div>
        <div className="hidden sm:flex gap-6 text-sm font-medium text-zinc-500">
          <a href="https://github.com/jackyzhong/potluck" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 transition-colors">
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-semibold mb-8 border border-zinc-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          v0.1.0 Alpha
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
          Split the bill. <br />
          <span className="text-zinc-400">Zero friction.</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-zinc-500 mb-10 max-w-xl">
          The account-less, ad-free way to track group expenses. 
          Create a group, share the link, and settle up instantly.
        </p>

        {/* Call to Action Button */}
        <Link 
          href="/create-group"
          className="bg-zinc-900 text-white px-8 py-4 rounded-full text-lg font-medium shadow-xl shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-2"
        >
          Create a group
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </main>
    </div>
  );
}