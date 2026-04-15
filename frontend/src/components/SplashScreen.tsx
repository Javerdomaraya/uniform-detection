import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#081229] z-50 text-white text-center">
      {/* Logo with rotation and glow effect */}
      <div className="mb-8">
        <img
          src="/Bipsu_new.png"
          alt="BIPSU Logo"
          className="w-48 h-48 md:w-52 md:h-52 object-contain animate-spin-slow"
          style={{ filter: 'drop-shadow(0 0 5px #0ff)' }}
        />
      </div>

      {/* Title Text */}
      <div className="max-w-xs md:max-w-sm font-bold text-lg md:text-xl leading-relaxed mb-6 px-4">

        UNIFORM COMPLIANCE SYSTEM<br />
        
      </div>

      {/* Loading Text */}
      <div className="text-sm md:text-base tracking-widest mb-3">
        LOADING...
      </div>

      {/* Loading Dots Animation */}
      <div className="flex justify-center gap-2">
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
      </div>
    </div>
  );
};

export default SplashScreen;