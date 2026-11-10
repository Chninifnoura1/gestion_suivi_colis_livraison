import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import Badge from "./Badge";

export default function Notifs() {
  const [n, setN] = useState(NOTIFS);
  return <div className="card"><button className="btn gray" style={{ marginBottom: 14 }} onClick={() => setN(n.map(x => [x[0], x[1], x[2], 1]))}>Marquer toutes comme lues</button>
    {n.map((x, i) => <div key={i} className={`card ${x[3] ? "" : "unread"}`} style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => setN(n.map((y, j) => j === i ? [y[0], y[1], y[2], 1] : y))}>
      <b>{x[0]}</b> <Badge s={x[3] ? "Lu" : "Non lu"} /><div>{x[1]}</div><small style={{ color: "var(--muted)" }}>{x[2]}</small></div>)}</div>;
}
