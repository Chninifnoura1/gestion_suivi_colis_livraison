import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function Profil({ go }) {
  const page = { t: "Profil", d: "Vos informations", b: [B("form", { items: PROFIL, submit: "Enregistrer", next: "profil" })] };
  return <PageView page={page} go={go} />;
}
