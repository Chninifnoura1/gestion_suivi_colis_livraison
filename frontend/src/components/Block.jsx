import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";
import Fld from "./Fld";
import Timeline from "./Timeline";
import Table from "./Table";
import Assign from "./Assign";
import Notifs from "./Notifs";
import Status from "./Status";
import Cards from "./Cards";
import Dispo from "./Dispo";
import Charts from "./Charts";

export default function Block({ b, go }) {
  const [ok, setOk] = useState(false), [er, setEr] = useState({}), ref = useRef();
  switch (b.k) {
    case "stats": return <div className="grid">{b.items.map(([t, n, c]) => <div key={t} className="card stat" style={{ "--c": c }}><small>{t}</small><div>{n}</div></div>)}</div>;
    case "btns": return <div className="row">{b.items.map(([l, cls, p, h]) => h ? <a key={l} className={`btn ${cls}`} href={h}>{l}</a> : <button key={l} className={`btn ${cls}`} style={{ height: b.big ? 48 : undefined }} onClick={() => go(p)}>{l}</button>)}</div>;
    case "table": return <Table {...b} go={go} />;
    case "kv": return <>{b.items.map(([t, kv]) => <div className="card" key={t}><h3>{t}</h3><div className="kv">{kv.map(([k, v]) => <div key={k}><small>{k}</small>{ST[v] ? <Badge s={v} /> : v}</div>)}</div></div>)}</>;
    case "tl": return <div className="card"><h3>Historique</h3><Timeline at={b.at} /></div>;
    case "form": return <div ref={ref}>{ok && <div className="toast">Enregistré avec succès.</div>}
      {b.items.map(([t, fs]) => <div className="card" key={t}><h3>{t}</h3><div className="form">{fs.map(f => <Fld key={f} l={f} pre={b.pre} err={er} />)}</div></div>)}
      <div className="row"><button className="btn" style={{ flex: "0 0 auto" }} onClick={() => { const e = {}; ref.current.querySelectorAll("[data-req]").forEach(i => { if (!i.value.trim()) e[i.dataset.l] = "Ce champ est obligatoire."; }); setEr(e); if (!Object.keys(e).length) { setOk(true); setTimeout(() => go(b.next), 800); } }}>{b.submit}</button>
        <button className="btn gray" style={{ flex: "0 0 auto" }} onClick={() => { ref.current.querySelectorAll("input,textarea").forEach(i => { i.value = ""; }); setEr({}); }}>Réinitialiser</button>
        <button className="btn gray" style={{ flex: "0 0 auto" }} onClick={() => go(b.next)}>Annuler</button></div></div>;
    case "assign": return <Assign />;
    case "notifs": return <Notifs />;
    case "status": return <Status go={go} />;
    case "charts": return <Charts />;
    case "cards": return <Cards {...b} go={go} />;
    case "dispo": return <Dispo />;
    default: return null;
  }
}
