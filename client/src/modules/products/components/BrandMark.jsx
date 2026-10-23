export default function BrandMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="DG logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="60" height="60" rx="17" fill="#913451" />
      <rect x="7" y="7" width="50" height="50" rx="13" fill="none" stroke="#ffffff" strokeOpacity=".2" />
      <path d="M43 17h7v7" fill="none" stroke="#ffd0df" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="51" cy="16" r="3" fill="#ffd0df" />
      <text x="31" y="41" textAnchor="middle" fill="#fff" fontFamily="Trebuchet MS, Segoe UI, sans-serif" fontSize="24" fontWeight="800" letterSpacing="-1.5">DG</text>
    </svg>
  );
}
