import { ADMIN_PAGES, Login as LoginAdmin } from "./admin";
import { CLIENT_PAGES, Login as LoginClient } from "./client";
import { LIVREUR_PAGES, Login as LoginLivreur } from "./livreur";

export const PAGES = { admin: ADMIN_PAGES, client: CLIENT_PAGES, livreur: LIVREUR_PAGES };
export const LOGINS = { admin: LoginAdmin, client: LoginClient, livreur: LoginLivreur };
