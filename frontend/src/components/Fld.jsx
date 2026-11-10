import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";

export default function Fld({ l, pre, err }) {
  const [sh, setSh] = useState(false);
  if (l.includes("=")) { const [n, o] = l.split("="); return <div><label>{n}</label><select>{o.split(",").map(x => <option key={x}>{x}</option>)}</select></div>; }
  const pw = /mot de passe|^Confirmation$/i.test(l);
  const t = pw ? (sh ? "text" : "password") : /email/i.test(l) ? "email" : /date/i.test(l) ? "date" : /poids|longueur|largeur|hauteur|frais/i.test(l) ? "number" : /photo/i.test(l) ? "file" : "text";
  const req = !/facultatif|remarque|commentaire|photo|signature|frais|ancien|nouveau/i.test(l), e = err?.[l];
  const d = pre ? { text: "Valeur actuelle", number: "1", date: "2026-11-03", email: "contact@mail.ma" }[t] : undefined;
  const p = { "data-req": req ? 1 : undefined, "data-l": l, defaultValue: d, style: e ? { borderColor: "#DC4C4C" } : undefined };
  return <div><label>{l}{req && " *"}</label><div style={{ position: "relative" }}>
    {/remarque|commentaire|description/i.test(l) ? <textarea {...p} /> : <input type={t} {...p} />}
    {pw && <button type="button" className="eye" aria-label="Afficher ou masquer" onClick={() => setSh(!sh)}>{sh ? <EyeOff size={18} /> : <Eye size={18} />}</button>}</div>
    {e && <small style={{ color: "#DC4C4C" }}>{e}</small>}</div>;
}
