import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";

export default function Cards({ tabs, limit, go }) {
  const [f, setF] = useState(""), M = { "En attente": ["Arrivé à destination", "Livreur affecté", "En attente"], "En cours": ["En cours de livraison"], "Terminées": ["Livré"], "Échouées": ["Échec de livraison"] };
  return <>{tabs && <div className="row">{["Toutes", ...Object.keys(M)].map(t => <button key={t} className={`btn ${(f || "Toutes") === t ? "" : "gray"}`} onClick={() => setF(t === "Toutes" ? "" : t)}>{t}</button>)}</div>}
    {LIVS.filter(x => !f || M[f].includes(x[5])).slice(0, limit || 9).map(x => <div className="card" key={x[0]}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><b>{x[0]}</b><Badge s={x[5]} /></div>
      <p style={{ margin: "8px 0 14px" }}>{x[1]} · {x[2]}<br /><small style={{ color: "var(--muted)" }}>{x[3]} · Affecté le {x[4]}</small></p>
      <div className="row" style={{ marginBottom: 0 }}><button className="btn navy" style={{ height: 48 }} onClick={() => go("det")}>Voir les détails</button>
        <a className="btn blue" href={`https://maps.google.com/?q=${encodeURIComponent(x[3])}`}><MapPin size={18} />Adresse</a><a className="btn ok" href={`tel:${x[2]}`}>Appeler</a></div></div>)}</>;
}
