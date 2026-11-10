import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";

export default function Charts() {
  const m = [12, 19, 15, 24, 30, 28], mo = ["Juin", "Juil", "Août", "Sep", "Oct", "Nov"], tot = 128; let off = 0;
  const pie = [["En attente", 14], ["En transit", 37], ["Arrivé à destination", 9], ["En cours de livraison", 12], ["Livré", 51], ["Échec de livraison", 5]];
  const bars = [["Agadir", 40], ["Casablanca", 32], ["Marrakech", 22], ["Rabat", 15]];
  return <div className="ch">
    <div className="card"><h3>Colis par mois</h3><svg viewBox="0 0 320 130" width="100%"><polyline fill="none" stroke="#F28C28" strokeWidth="3" points={m.map((v, i) => `${25 + i * 54},${100 - v * 2.8}`).join(" ")} />
      {m.map((v, i) => <g key={i}><circle cx={25 + i * 54} cy={100 - v * 2.8} r="4" fill="#172B4D" /><text x={25 + i * 54} y="120" fontSize="11" textAnchor="middle" fill="#718096">{mo[i]}</text></g>)}</svg></div>
    <div className="card"><h3>Répartition par statut</h3><svg viewBox="0 0 120 120" width="100%" style={{ maxHeight: 130 }}>
      {pie.map(([s, n]) => { const len = n / tot * 251.3, o = off; off += len; return <circle key={s} cx="60" cy="60" r="40" fill="none" stroke={ST[s]} strokeWidth="20" strokeDasharray={`${len} ${251.3 - len}`} strokeDashoffset={-o} transform="rotate(-90 60 60)" />; })}</svg>
      <div style={{ fontSize: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>{pie.map(([s, n]) => <span key={s} style={{ color: ST[s] }}>● {s} ({n})</span>)}</div></div>
    <div className="card"><h3>Colis par ville de destination</h3><svg viewBox="0 0 320 130" width="100%">
      {bars.map(([c, n], i) => <g key={c}><rect x={25 + i * 75} y={105 - n * 2.2} width="44" height={n * 2.2} rx="4" fill="#172B4D" /><text x={47 + i * 75} y="122" fontSize="11" textAnchor="middle" fill="#718096">{c}</text><text x={47 + i * 75} y={100 - n * 2.2} fontSize="11" textAnchor="middle" fill="#263238">{n}</text></g>)}</svg></div></div>;
}
