import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function SuiviColis({ go }) {
  const page = { t: "Suivi de colis", d: "CT-0001 · Casablanca → Agadir", b: [B("tl", { at: 3 }), B("kv", { items: [["Livreur", KV({ Nom: "Non affecté", Statut: "Arrivé à destination" })]] }), act("Détails du colis", "det")] };
  return <PageView page={page} go={go} />;
}
