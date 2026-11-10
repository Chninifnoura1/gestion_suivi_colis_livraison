import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";

export default function Dispo() {
  const [o, setO] = useState(true);
  return <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span>Disponibilité : <Badge s={o ? "Disponible" : "Indisponible"} /></span>
    <button className={`btn ${o ? "gray" : "ok"}`} onClick={() => setO(!o)}>{o ? "Passer indisponible" : "Passer disponible"}</button></div>;
}
