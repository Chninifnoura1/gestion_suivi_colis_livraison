export function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b9bff" /><stop offset="1" stopColor="#2a68e0" /></linearGradient></defs>
      <rect width="34" height="34" rx="10" fill="url(#lg)" />
      <path d="M17 7.5l8.2 4.6v9.2L17 26l-8.2-4.7v-9.2z" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M8.8 12.1L17 16.8l8.2-4.7M17 16.8V26" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="17" cy="16.8" r="2.7" fill="#f28c38" stroke="#2a68e0" strokeWidth="1.4" />
    </svg>
  );
}
export default function Logo({ size = 34, compact, inverse }) {
  return (
    <span className={`logo${inverse ? " logo-inverse" : ""}`}>
      <LogoMark size={size} />
      {!compact && <span className="logo-word">Colis<b>Track</b></span>}
    </span>
  );
}
