import React from 'react';

export const CardSkeletonLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0813] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full mx-auto text-center space-y-5">
        
        {/* Animated Spinner & Logo Ring */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Outer glowing pulsing aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/30 via-amber-500/20 to-fuchsia-500/20 blur-md animate-pulse" />
          
          {/* Animated spinner ring accent revolving around the logo */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F59E0B] border-r-purple-400 animate-spin" />

          {/* Central Logo - untouched original user artwork */}
          <div className="relative z-10 w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shadow-2xl">
            <img 
              src="/icon-192.png" 
              alt="Section F Logo" 
              loading="eager"
              decoding="async"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Title & Brand */}
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold tracking-[0.25em] text-white uppercase font-sans">
            Section F
          </h1>
          <p className="text-[11px] font-medium tracking-[0.2em] text-purple-300/70 uppercase">
            Harvard Business School
          </p>
        </div>

      </div>
    </div>
  );
};

