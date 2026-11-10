import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";

export default function Status({ go }) {
  const [s, setS] = useState("En attente");
  return <div className="card"><p>Statut actuel : <Badge s={s} /></p><div style={{ display: "grid", gap: 10 }}>
    <button className="btn" style={{ height: 48 }} onClick={() => setS("En cours de livraison")}>Commencer la livraison</button>
    <button className="btn ok" style={{ height: 48 }} onClick={() => go("conf")}>Confirmer la livraison</button>
    <button className="btn red" style={{ height: 48 }} onClick={() => go("prob")}>Signaler un problème</button></div></div>;
}
