import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";
import Fld from "./Fld";

export default function Assign() {
  const [c, setC] = useState(), [l, setL] = useState(), [ok, setOk] = useState(false);
  return <><div className="split">
    <div className="card"><h3>Colis arrivés non affectés</h3>{C.filter(x => x[6] === "Arrivé à destination").map(x => <div key={x[0]} className={`card pick ${c === x[0] ? "sel" : ""}`} onClick={() => setC(x[0])}><b>{x[0]}</b><div>{x[2]} · 0698765432 · 12 Rue Hassan II, {x[4]}</div><small>Arrivé le {x[5]}</small></div>)}</div>
    <div className="card"><h3>Livreurs disponibles</h3>{LV.map(x => <div key={x[0]} className={`card pick ${l === x[0] ? "sel" : ""}`} style={{ opacity: x[2] === "Disponible" ? 1 : .5 }} onClick={() => x[2] === "Disponible" && setL(x[0])}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><b>{x[0]}</b><Badge s={x[2]} /></div><small>{x[1]} · {x[3]} en cours</small></div>)}</div></div>
    <div className="card"><Fld l="Date d'affectation" /></div>
    {ok ? <div className="toast">Affectation confirmée. Le livreur et le client sont notifiés.</div> : <button className="btn ok" disabled={!c || !l} style={{ opacity: c && l ? 1 : .5 }} onClick={() => setOk(true)}>Confirmer l'affectation</button>}</>;
}
