import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function MiseAJourStatut({ go }) {
  const page = { t: "Mise à jour du statut", d: "Faites avancer votre mission", b: [B("status")] };
  return <PageView page={page} go={go} />;
}
