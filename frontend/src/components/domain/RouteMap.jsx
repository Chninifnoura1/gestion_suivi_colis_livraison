import useMedia from "../../hooks/useMedia";

const CITIES = [
  { n: "Tanger", x: 262, y: 44, a: "start" }, { n: "Rabat", x: 214, y: 150, a: "end" }, { n: "Fès", x: 330, y: 168, a: "start" },
  { n: "Casablanca", x: 164, y: 218, a: "end" }, { n: "Marrakech", x: 238, y: 336, a: "start" }, { n: "Agadir", x: 118, y: 452, a: "end" },
];
const MAIN = "M262 44 C250 92 224 112 214 150 S178 190 164 218 S222 292 238 336 S144 404 118 452";
const BRANCH = "M214 150 C250 138 296 146 330 168";

/* Illustration : réseau d'agences et colis en mouvement. Le mouvement est coupé si l'utilisateur réduit les animations. */
export default function RouteMap({ className = "" }) {
  const still = useMedia("(prefers-reduced-motion: reduce)");
  return (
    <svg className={`routemap ${className}`} viewBox="0 0 420 500" role="img" aria-label="Réseau d'agences ColisTrack : Tanger, Rabat, Fès, Casablanca, Marrakech, Agadir">
      <defs>
        <pattern id="rm-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="currentColor" strokeOpacity=".07" /></pattern>
        <linearGradient id="rm-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity="0" /><stop offset=".5" stopColor="currentColor" stopOpacity=".1" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="420" height="500" fill="url(#rm-grid)" />
      <rect width="420" height="500" fill="url(#rm-fade)" />
      <g fill="none" strokeLinecap="round">
        <path id="rm-main" d={MAIN} stroke="currentColor" strokeOpacity=".28" strokeWidth="2" strokeDasharray="2 9" />
        <path d={BRANCH} stroke="currentColor" strokeOpacity=".28" strokeWidth="2" strokeDasharray="2 9" />
        <path d={MAIN} stroke="var(--orange)" strokeWidth="3" pathLength="1" strokeDasharray="1" className="rm-draw" />
      </g>
      {CITIES.map((c) => (
        <g key={c.n}>
          <circle cx={c.x} cy={c.y} r="11" fill="currentColor" fillOpacity=".08" />
          <circle cx={c.x} cy={c.y} r="5.5" fill="var(--navy)" stroke="currentColor" strokeWidth="2" />
          <text x={c.x + (c.a === "start" ? 16 : -16)} y={c.y + 4} textAnchor={c.a} fontSize="13" fontWeight="600" fill="currentColor" fontFamily="var(--font-display)">{c.n}</text>
        </g>
      ))}
      <g>
        <circle r="13" fill="var(--orange)" fillOpacity=".25">{!still && <animate attributeName="r" values="11;19;11" dur="2.4s" repeatCount="indefinite" />}</circle>
        <rect x="-8" y="-8" width="16" height="16" rx="4.5" fill="var(--orange)" />
        <path d="M-4 -1.5l4 2.2 4-2.2M0 .7v4.6" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        {!still && <animateMotion dur="14s" repeatCount="indefinite" rotate="0" keyPoints="0;1;1" keyTimes="0;.88;1" calcMode="linear"><mpath href="#rm-main" /></animateMotion>}
        {still && <animateMotion dur="1s" fill="freeze" keyPoints="0.55;0.55" keyTimes="0;1" calcMode="linear"><mpath href="#rm-main" /></animateMotion>}
      </g>
    </svg>
  );
}
