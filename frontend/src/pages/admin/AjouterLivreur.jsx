import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function AjouterLivreur({ go }) {
  const page = { t: "Ajouter un livreur", d: "Créez le compte d'un livreur", b: [B("form", { items: [["Informations personnelles", ["Nom", "Prénom", "Email", "Téléphone", "Adresse", "Photo"]], ["Compte", ["Identifiant", "Mot de passe initial", "Confirmation du mot de passe"]], ["Professionnel", ["Disponibilité=Disponible,Indisponible", "Statut du compte=Actif,Inactif"]]], submit: "Enregistrer", next: "livreurs" })] };
  return <PageView page={page} go={go} />;
}
