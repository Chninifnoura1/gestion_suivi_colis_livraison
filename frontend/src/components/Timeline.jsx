import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";

export default function Timeline({ at = 3 }) {
  return <ul className="tl">{STEPS.map((s, i) => { const done = i < at, now = i === at;
    return <li key={s} style={{ "--d": done ? "#16A36A" : now ? "#F28C28" : "#d5dce6", "--l": done ? "#16A36A" : "#d5dce6" }}>
      <span className="dot">{done ? <Check size={16} /> : <Package size={16} />}</span>
      <div><b style={{ color: i > at ? "var(--muted)" : "var(--navy)" }}>{s}</b><div style={{ color: "var(--muted)", fontSize: 13 }}>{i <= at ? `0${i + 3}/11/2026 · 1${i}:30 · Agadir` : "À venir"}</div></div></li>; })}</ul>;
}
