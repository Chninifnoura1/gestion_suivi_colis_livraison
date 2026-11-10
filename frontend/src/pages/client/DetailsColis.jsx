import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function DetailsColis({ go }) {
  const page = { t: "Détails du colis", d: "Informations en lecture seule", b: [B("kv", { items: COLIS_KV }), B("tl", { at: 3 }), B("btns", { items: [["Suivre le colis", "", "suivi"], ["Retour à Mes colis", "gray", "colis"]] })] };
  return <PageView page={page} go={go} />;
}
