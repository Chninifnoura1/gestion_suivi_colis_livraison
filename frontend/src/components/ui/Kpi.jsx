import useCountUp from "../../hooks/useCountUp";

function Value({ value, suffix = "" }) {
  const n = useCountUp(typeof value === "number" ? value : 0);
  return <span className="kpi-value tabular">{typeof value === "number" ? n : value}{suffix}</span>;
}

/* Bandeau d'indicateurs : une seule surface, des séparateurs — plus lisible qu'une rangée de cartes identiques. */
export function KpiStrip({ items, cols }) {
  return (
    <div className="kpi-strip reveal" style={cols ? { "--cols": cols } : undefined}>
      {items.map((k, i) => (
        <div key={k.label} className="kpi" style={{ "--i": i }}>
          <div className="kpi-top">{k.icon && <span className={`kpi-ic tone-${k.tone || "info"}`}><k.icon size={15} /></span>}<span className="kpi-label">{k.label}</span></div>
          <Value value={k.value} suffix={k.suffix} />
          {k.sub && <span className={`kpi-sub ${k.subTone ? `tone-${k.subTone}` : ""}`}>{k.sub}</span>}
        </div>
      ))}
    </div>
  );
}
