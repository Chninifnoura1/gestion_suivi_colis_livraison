import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";
import { TITLES } from "../data/menus";
import Fld from "./Fld";

export default function LoginForm({ role, setRole, onLogin }) {
  const ref = useRef(), [err, setErr] = useState("");
  return <div className="login"><div className="hero"><div className="logo" style={{ padding: 0, fontSize: 28 }}>Colis<b>Track</b></div>
    <h1>Chaque colis, de l'envoi à la porte du destinataire.</h1><p style={{ color: "#cbd5e1" }}>Gestion et suivi des colis et livraisons.</p></div>
    <div className="box"><div className="card"><h1>Bienvenue sur ColisTrack</h1><p className="sub">Connectez-vous à votre {TITLES[role].toLowerCase()}</p>
      <div ref={ref} style={{ display: "grid", gap: 14 }}>{err && <div role="alert" style={{ background: "#fdecec", color: "#DC4C4C", padding: 10, borderRadius: 8 }}>{err}</div>}
        <div><label>Espace</label><select value={role} onChange={e => setRole(e.target.value)}><option value="admin">Administrateur</option><option value="client">Client</option><option value="livreur">Livreur</option></select></div>
        <Fld l="Email" /><Fld l="Mot de passe" />
        <label style={{ display: "flex", gap: 8 }}><input type="checkbox" style={{ width: 18, height: 18 }} />Se souvenir de moi</label>
        <button className="btn" style={{ height: 46 }} onClick={() => [...ref.current.querySelectorAll("[data-req]")].some(i => !i.value.trim()) ? setErr("Email ou mot de passe incorrect.") : onLogin()}>Se connecter</button><a href="#" style={{ color: "var(--navy)", fontSize: 14 }}>Mot de passe oublié ?</a></div></div></div></div>;
}
