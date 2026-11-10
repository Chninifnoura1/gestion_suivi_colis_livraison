import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";

export default function Table({ cols, rows, open, label = "Détails", acts, search, filter, date, go }) {
  const [q, setQ] = useState(""), [f, setF] = useState({}), [d, setD] = useState(""), [p, setP] = useState(0), [ps, setPs] = useState(5);
  const fi = filter ? cols.map((c, i) => /^(Statut|Départ|Arrivée|Disponibilité|Statut du compte)$/.test(c) ? i : -1).filter(i => i >= 0) : [], di = cols.indexOf("Date");
  const all = rows.filter(x => x.join(" ").toLowerCase().includes(q.toLowerCase()) && fi.every(i => !f[i] || x[i] === f[i]) && (!d || x[di] === d.split("-").reverse().join("/")));
  const r = all.slice(p * ps, (p + 1) * ps), A = acts || (open ? [[label, "navy", open]] : []);
  return <div className="card">
    {(search || filter) && <div className="row">
      {search && <div style={{ flex: 3, position: "relative" }}><Search size={16} style={{ position: "absolute", left: 12, top: 15, color: "var(--muted)" }} />
        <input style={{ paddingLeft: 36 }} placeholder="Rechercher par numéro, nom, expéditeur ou destinataire..." value={q} onChange={e => { setQ(e.target.value); setP(0); }} /></div>}
      {fi.map(i => <select key={i} value={f[i] || ""} onChange={e => { setF({ ...f, [i]: e.target.value }); setP(0); }}><option value="">{cols[i]} : tous</option>{[...new Set(rows.map(x => x[i]))].map(s => <option key={s}>{s}</option>)}</select>)}
      {date && di >= 0 && <input type="date" aria-label="Date" value={d} onChange={e => setD(e.target.value)} />}
      <button className="btn gray" onClick={() => { setQ(""); setF({}); setD(""); setP(0); }}>Réinitialiser les filtres</button></div>}
    <div className="tw"><table><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}{A.length > 0 && <th>Actions</th>}</tr></thead>
      <tbody>{r.map((x, i) => <tr key={i}>{x.map((c, j) => <td key={j}>{ST[c] ? <Badge s={c} /> : cols[j] === "Photo" ? <span className="av">{c}</span> : j === 0 ? <b>{c}</b> : c}</td>)}
        {A.length > 0 && <td style={{ whiteSpace: "nowrap" }}>{A.map(([l, cls, pg, m]) => <button key={l} className={`btn ${cls}`} style={{ marginRight: 6, padding: "8px 12px" }} onClick={() => pg ? go(pg) : window.confirm(m || "Confirmer cette action ?")}>{l}</button>)}</td>}</tr>)}</tbody></table></div>
    {!r.length && <p className="sub">Aucun résultat. Modifiez votre recherche ou vos filtres.</p>}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
      <select style={{ width: 110 }} value={ps} onChange={e => { setPs(+e.target.value); setP(0); }}>{[5, 10, 20].map(n => <option key={n} value={n}>{n} / page</option>)}</select>
      <button className="btn gray" disabled={p === 0} onClick={() => setP(p - 1)}>Précédent</button><span>Page {p + 1}</span>
      <button className="btn gray" disabled={(p + 1) * ps >= all.length} onClick={() => setP(p + 1)}>Suivant</button></div></div>;
}
