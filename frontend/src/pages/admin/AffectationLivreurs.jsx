import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function AffectationLivreurs({ go }) {
  const page = { t: "Affectation des livreurs", d: "Affectez les colis arrivés aux livreurs disponibles", b: [B("assign")] };
  return <PageView page={page} go={go} />;
}
