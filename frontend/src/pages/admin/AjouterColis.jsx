import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function AjouterColis({ go }) {
  const page = { t: "Ajouter un colis", d: "Remplissez les quatre sections", b: [B("form", { items: [SEC.exp, SEC.dest, SEC.col, SEC.ship], submit: "Enregistrer le colis", next: "det" })] };
  return <PageView page={page} go={go} />;
}
