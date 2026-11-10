import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function ProfilParametres({ go }) {
  const page = { t: "Profil et paramètres", d: "Compte administrateur", b: [B("form", { items: [...PROFIL, ["Paramètres", ["Langue=Français,English,العربية", "Préférences de notifications=Toutes,Importantes"]]], submit: "Enregistrer", next: "profil" })] };
  return <PageView page={page} go={go} />;
}
