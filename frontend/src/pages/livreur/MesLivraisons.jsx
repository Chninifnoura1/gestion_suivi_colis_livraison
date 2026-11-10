import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function MesLivraisons({ go }) {
  const page = { t: "Mes livraisons", d: "Toutes · En attente · En cours · Terminées · Échouées", b: [B("cards", { tabs: 1 })] };
  return <PageView page={page} go={go} />;
}
