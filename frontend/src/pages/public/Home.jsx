import { useState } from "react";
import { Search, AlertCircle, ArrowRight, ShieldCheck, Clock3 } from "lucide-react";
import PublicLayout from "../../layouts/PublicLayout";
import RouteMap from "../../components/domain/RouteMap";
import { STATUS_ICON } from "../../components/domain/Timeline";
import Button from "../../components/ui/Button";
import { FLOW, STATUS, PUBLIC_MESSAGE } from "../../lib/constants";
import { useNavigate } from "../../lib/router";
import { demoTrackingCodes } from "../../services/api";

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState(""), [err, setErr] = useState("");
  const go = (value) => { const c = value.trim().toUpperCase(); if (!c) { setErr("Saisissez votre numéro de suivi pour continuer."); return; } setErr(""); navigate(`/suivi/${encodeURIComponent(c)}`); };
  return (
    <PublicLayout hero>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <h1>Suivez votre colis en toute simplicité</h1>
            <p className="hero-lead">Entrez votre numéro de suivi pour connaître la position de votre colis et la date de livraison prévue. Aucun compte nécessaire.</p>
            <form className="track-form" onSubmit={(e) => { e.preventDefault(); go(code); }} role="search">
              <div className="control-wrap field">
                <label htmlFor="track-code" className="sr-only">Numéro de suivi</label>
                <Search className="control-ic" aria-hidden />
                <input id="track-code" value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="Numéro de suivi, ex. CT-0001" autoComplete="off" autoCapitalize="characters" aria-invalid={!!err} aria-describedby={err ? "track-err" : undefined} />
              </div>
              <Button type="submit" variant="accent" size="lg" iconRight={ArrowRight}>Suivre mon colis</Button>
            </form>
            {err && <p id="track-err" className="track-err" role="alert"><AlertCircle size={15} />{err}</p>}
            <div className="demo-chips" aria-label="Exemples de démonstration">
              <span>Exemples :</span>
              {demoTrackingCodes().map((d) => <button key={d.code} type="button" className={`chip tone-${d.tone}`} onClick={() => go(d.code)}><i />{d.label}</button>)}
            </div>
          </div>
          <div className="hero-art"><RouteMap /></div>
        </div>
      </section>

      <section className="steps-sec" aria-labelledby="steps-title">
        <h2 id="steps-title">Les étapes du parcours de votre colis</h2>
        <p>De l'agence d'envoi à votre porte, chaque étape est enregistrée et visible dans le suivi.</p>
        <ol className="steps">
          {FLOW.map((s) => { const I = STATUS_ICON[s]; return (
            <li key={s} className={`step tone-${STATUS[s].tone}`}>
              <span className="step-ic"><I size={20} /></span>
              <div><strong>{STATUS[s].event.replace("Arrivé à l'agence de destination", "Arrivé à l'agence")}</strong><p>{PUBLIC_MESSAGE[s].text}</p></div>
            </li>); })}
        </ol>
      </section>
      <section className="steps-sec" style={{ paddingTop: 0 }}>
        <div className="grid-2">
          <div className="card row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}><ShieldCheck size={22} color="var(--success)" style={{ flexShrink: 0 }} /><div><strong>Vos données restent privées</strong><p className="muted">Le suivi affiche uniquement les villes et les étapes. Aucun nom, téléphone ni adresse n'est visible.</p></div></div>
          <div className="card row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}><Clock3 size={22} color="var(--blue)" style={{ flexShrink: 0 }} /><div><strong>Informations à jour</strong><p className="muted">Chaque changement de statut apparaît dans l'historique avec sa date et son heure.</p></div></div>
        </div>
      </section>
    </PublicLayout>
  );
}
