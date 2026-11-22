import { useEffect, useRef, useState } from "react";

function useWidth() {
  const ref = useRef(null), [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  return [ref, w];
}
const nice = (m) => { if (m <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(m))); const n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const smooth = (pts) => pts.reduce((d, [x, y], i) => { if (!i) return `M${x},${y}`; const [px, py] = pts[i - 1], mx = (px + x) / 2; return `${d} C${mx},${py} ${mx},${y} ${x},${y}`; }, "");

export function Legend({ items }) {
  return <ul className="legend">{items.map((s) => <li key={s.key || s.label}><i style={{ background: s.color }} />{s.label}</li>)}</ul>;
}

/* Courbes avec aire dégradée, infobulle et repère au survol. */
export function AreaChart({ data, series, height = 240 }) {
  const [ref, w] = useWidth(), [hv, setHv] = useState(null);
  const pad = { t: 10, r: 10, b: 26, l: 30 }, iw = Math.max(w - pad.l - pad.r, 10), ih = height - pad.t - pad.b;
  const max = nice(Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0))));
  const x = (i) => pad.l + (data.length > 1 ? (i * iw) / (data.length - 1) : iw / 2), y = (v) => pad.t + ih - (v / max) * ih;
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 54)));
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (data.length - 1)); setHv(Math.max(0, Math.min(data.length - 1, i))); };
  return (
    <div className="chart" ref={ref}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Évolution dans le temps" onPointerMove={move} onPointerLeave={() => setHv(null)}>
          <defs>{series.map((s) => <linearGradient key={s.key} id={`ag-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".22" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
          {[0, 1, 2, 3, 4].map((t) => { const v = (max / 4) * t; return <g key={t}><line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} className="chart-grid" /><text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">{Math.round(v)}</text></g>; })}
          {data.map((d, i) => i % every === 0 && <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="chart-tick">{d.label}</text>)}
          {series.map((s) => {
            const pts = data.map((d, i) => [x(i), y(d[s.key] || 0)]), line = smooth(pts);
            return (
              <g key={s.key}>
                <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#ag-${s.key})`} className="chart-area" />
                <path d={line} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" pathLength="1" className="chart-line" />
              </g>
            );
          })}
          {hv !== null && <g><line x1={x(hv)} x2={x(hv)} y1={pad.t} y2={pad.t + ih} className="chart-guide" />{series.map((s) => <circle key={s.key} cx={x(hv)} cy={y(data[hv][s.key] || 0)} r="4.5" fill="var(--surface)" stroke={s.color} strokeWidth="2.4" />)}</g>}
        </svg>
      )}
      {hv !== null && w > 0 && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hv), 70), w - 70), top: 0 }}>
          <strong>{data[hv].label}</strong>
          {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}<b className="tabular">{data[hv][s.key] || 0}</b></span>)}
        </div>
      )}
    </div>
  );
}

/* Barres groupées verticales. */
export function BarChart({ data, series, height = 240 }) {
  const [ref, w] = useWidth(), [hv, setHv] = useState(null);
  const pad = { t: 10, r: 10, b: 30, l: 30 }, iw = Math.max(w - pad.l - pad.r, 10), ih = height - pad.t - pad.b;
  const max = nice(Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0))));
  const band = iw / data.length, bw = Math.min(26, (band * 0.7) / series.length);
  const y = (v) => pad.t + ih - (v / max) * ih;
  return (
    <div className="chart" ref={ref}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Comparaison par catégorie">
          {[0, 1, 2, 3, 4].map((t) => { const v = (max / 4) * t; return <g key={t}><line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} className="chart-grid" /><text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">{Math.round(v)}</text></g>; })}
          {data.map((d, i) => {
            const cx = pad.l + band * i + band / 2, total = bw * series.length + 3 * (series.length - 1);
            return (
              <g key={d.label} onPointerEnter={() => setHv(i)} onPointerLeave={() => setHv(null)}>
                <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
                {hv === i && <rect x={pad.l + band * i + 4} y={pad.t} width={band - 8} height={ih} rx="6" className="chart-hover" />}
                {series.map((s, j) => { const h = ih - (y(d[s.key] || 0) - pad.t); return <rect key={s.key} x={cx - total / 2 + j * (bw + 3)} y={y(d[s.key] || 0)} width={bw} height={Math.max(h, 0)} rx="4" fill={s.color} className="chart-bar" style={{ animationDelay: `${i * 40}ms` }} />; })}
                <text x={cx} y={height - 10} textAnchor="middle" className="chart-tick">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
      {hv !== null && w > 0 && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(pad.l + band * hv + band / 2, 70), w - 70), top: 0 }}>
          <strong>{data[hv].label}</strong>
          {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}<b className="tabular">{data[hv][s.key] || 0}</b></span>)}
        </div>
      )}
    </div>
  );
}

/* Anneau de répartition + légende détaillée. */
export function Donut({ data, centerValue, centerLabel }) {
  const [hv, setHv] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1, R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut">
      <div className="donut-ring">
        <svg viewBox="0 0 140 140" role="img" aria-label="Répartition par statut">
          <circle cx="70" cy="70" r={R} className="donut-track" />
          {data.map((d) => {
            const len = (d.value / total) * C, off = acc; acc += len;
            return <circle key={d.label} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth={hv === d.label ? 17 : 14} strokeDasharray={`${Math.max(len - 2.5, 0)} ${C - Math.max(len - 2.5, 0)}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" className="donut-seg" style={{ opacity: hv && hv !== d.label ? 0.35 : 1 }} />;
          })}
        </svg>
        <div className="donut-center"><strong className="tabular">{hv ? data.find((d) => d.label === hv).value : centerValue}</strong><span>{hv || centerLabel}</span></div>
      </div>
      <ul className="donut-legend">
        {data.map((d) => (
          <li key={d.label} onPointerEnter={() => setHv(d.label)} onPointerLeave={() => setHv(null)}>
            <i style={{ background: d.color }} /><span>{d.label}</span><b className="tabular">{d.value}</b><small className="tabular">{Math.round((d.value / total) * 100)} %</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Classement horizontal (livreurs, agences…). */
export function BarList({ items, suffix = "" }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {items.map((it, k) => (
        <li key={it.label}>
          <div className="barlist-top"><span className="truncate">{it.label}</span><b className="tabular">{it.display ?? it.value}{suffix}</b></div>
          <div className="barlist-track"><i style={{ width: `${(it.value / max) * 100}%`, background: it.color || "var(--blue)", animationDelay: `${k * 50}ms` }} /></div>
          {it.meta && <small>{it.meta}</small>}
        </li>
      ))}
    </ul>
  );
}
