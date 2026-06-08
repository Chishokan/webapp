// 智翔館ブランドカラーのロゴマーク（朝日＝ゴールド + 飛翔のスウッシュ＝ブルー）。
// インラインSVGなので外部ファイル不要で常に表示される。
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="智翔館ロゴ"
    >
      <defs>
        <linearGradient id="logoSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD23F" />
          <stop offset="100%" stopColor="#F0A500" />
        </linearGradient>
      </defs>
      {/* 朝日 */}
      <circle cx="40" cy="74" r="24" fill="url(#logoSun)" />
      {/* 飛翔のスウッシュ */}
      <path
        d="M20 58 L42 84 L100 18"
        fill="none"
        stroke="#15539a"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold text-brand-700">おはよう勉強会</span>
        <span className="text-[10px] font-medium tracking-widest text-gold-600">
          智翔館
        </span>
      </span>
    </span>
  );
}
