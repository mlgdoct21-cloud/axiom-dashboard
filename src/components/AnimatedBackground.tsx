'use client';

export default function AnimatedBackground() {
  return (
    <>
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Orb 1: Purple */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-purple-600/30 to-purple-900/10 rounded-full blur-3xl animate-orbFloat"></div>

        {/* Orb 2: Cyan */}
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-bl from-cyan-500/20 to-cyan-900/5 rounded-full blur-3xl animate-orbFloat" style={{ animationDelay: '2s' }}></div>

        {/* Orb 3: Orange */}
        <div className="absolute bottom-32 left-1/2 w-96 h-96 bg-gradient-to-tr from-orange-500/15 to-orange-900/5 rounded-full blur-3xl animate-orbFloat" style={{ animationDelay: '4s' }}></div>

        {/* Orb 4: Green */}
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-gradient-to-tl from-green-500/10 to-green-900/5 rounded-full blur-3xl animate-orbFloat" style={{ animationDelay: '3s' }}></div>

        {/* Orb 5: Purple accent */}
        <div className="absolute -top-40 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-600/20 to-indigo-900/5 rounded-full blur-3xl animate-orbFloat" style={{ animationDelay: '5s' }}></div>
      </div>

      {/* Gradient mesh overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      </div>
    </>
  );
}
