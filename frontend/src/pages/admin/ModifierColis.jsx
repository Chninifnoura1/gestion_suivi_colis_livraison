import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function ModifierColis({ go }) {
  const page = { t: "Modifier un colis", d: "Le statut suit le processus de transport et ne se modifie pas ici", b: [B("form", { items: [SEC.exp, SEC.dest, SEC.col], pre: 1, submit: "Enregistrer les modifications", next: "det" })] };
  return <PageView page={page} go={go} />;
}
