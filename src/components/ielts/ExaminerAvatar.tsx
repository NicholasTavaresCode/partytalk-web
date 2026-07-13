/** A friendly, on-brand SVG illustration of the AI examiner (no remote images). */
export function ExaminerAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="AI examiner">
      <defs>
        <linearGradient id="ex-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2f6" />
          <stop offset="1" stopColor="#dbe4ec" />
        </linearGradient>
      </defs>

      <rect width="200" height="200" fill="url(#ex-bg)" />

      {/* soft office hints */}
      <rect x="16" y="22" width="50" height="60" rx="4" fill="#ffffff" opacity="0.55" />
      <line x1="41" y1="22" x2="41" y2="82" stroke="#c3c6d1" strokeWidth="1.5" opacity="0.6" />
      <line x1="16" y1="52" x2="66" y2="52" stroke="#c3c6d1" strokeWidth="1.5" opacity="0.6" />
      <rect x="138" y="40" width="46" height="44" rx="3" fill="#c9a900" opacity="0.25" />
      <rect x="146" y="48" width="8" height="36" rx="2" fill="#003366" opacity="0.35" />
      <rect x="158" y="48" width="8" height="36" rx="2" fill="#bb0027" opacity="0.3" />
      <rect x="170" y="48" width="8" height="36" rx="2" fill="#003366" opacity="0.35" />

      {/* shoulders / blazer */}
      <path d="M34 200 Q40 150 100 150 Q160 150 166 200 Z" fill="#003366" />
      {/* shirt */}
      <path d="M84 152 L100 176 L116 152 Z" fill="#f8fafb" />
      {/* lapels */}
      <path d="M84 152 L100 176 L88 158 Z" fill="#00284f" />
      <path d="M116 152 L100 176 L112 158 Z" fill="#00284f" />

      {/* neck */}
      <rect x="88" y="120" width="24" height="34" rx="10" fill="#e0aa82" />
      {/* head */}
      <circle cx="100" cy="94" r="37" fill="#eabf98" />
      {/* ears */}
      <circle cx="64" cy="96" r="7" fill="#e0aa82" />
      <circle cx="136" cy="96" r="7" fill="#e0aa82" />
      {/* hair */}
      <path
        d="M62 98 Q58 54 100 54 Q142 54 138 98 Q132 74 116 68 Q108 84 100 84 Q92 84 84 68 Q68 74 62 98 Z"
        fill="#5a4636"
      />
      <path d="M60 96 Q58 120 66 132 L70 108 Q64 100 60 96 Z" fill="#5a4636" />
      <path d="M140 96 Q142 120 134 132 L130 108 Q136 100 140 96 Z" fill="#5a4636" />

      {/* face */}
      <ellipse cx="87" cy="94" rx="3.4" ry="4.2" fill="#2e2620" />
      <ellipse cx="113" cy="94" rx="3.4" ry="4.2" fill="#2e2620" />
      <path d="M80 84 Q87 80 94 84" stroke="#5a4636" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M106 84 Q113 80 120 84" stroke="#5a4636" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M88 110 Q100 120 112 110" stroke="#b06b52" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
