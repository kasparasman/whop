export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-black">
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl space-y-12 text-center">
          {/* Hero section */}
          <div className="space-y-6">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent">
              Welcome
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              A simple, beautiful experience built with Next.js
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="group relative p-8 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 flex items-center justify-center text-white text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Fast
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Built for performance and speed
              </p>
            </div>

            <div className="group relative p-8 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 mb-4 flex items-center justify-center text-white text-2xl">
                🎨
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Modern
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Clean design with smooth animations
              </p>
            </div>

            <div className="group relative p-8 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 mb-4 flex items-center justify-center text-white text-2xl">
                🌙
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Dark Mode
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Automatic theme support included
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <button className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-900 font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-zinc-700 to-zinc-600 dark:from-zinc-300 dark:to-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
