import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function DetailsColis({ go }) {
  const page = { t: "Détails du colis", d: "CT-0001", b: [B("btns", { items: [["Modifier", "blue", "edit"], ["Affecter un livreur", "", "assign"], ["Retour", "gray", "colis"]] }), B("kv", { items: [...COLIS_KV, ["Livraison", KV({ Livreur: "Non affecté", Statut: "Arrivé à destination" })]] }), B("tl", { at: 3 })] };
  return <PageView page={page} go={go} />;
}
