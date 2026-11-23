
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import * as auth from "../services/auth";
import { ROLE_META } from "../lib/constants";

const Ctx = createContext(null);
const KEY = "ct-auth-session";

const readSession = () => {
  try {
    const saved = sessionStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const formatUser = (user) => ({
  id: user.id,
  name: `${user.prenom} ${user.nom}`.trim(),
  firstName: user.prenom,
  lastName: user.nom,
  email: user.email,
  phone: user.telephone,
  role: user.role,
  agencyId: user.agence_id,
  agency: user.agence
    ? {
        id: user.agence.id,
        name: user.agence.nom_agence,
        city: user.agence.ville,
        address: user.agence.adresse,
        phone: user.agence.telephone,
      }
    : null,
  matricule: user.matricule,
  available: user.disponible,
  villeActuelle: user.ville_actuelle || "",
});


export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const login = useCallback(async (email, password, selectedRole) => {
  const result = await auth.login(email, password);

  const token = result.access_token;
  if (!token) {
    throw new Error("Le serveur n'a pas retourné de jeton.");
  }

  const backendUser = await auth.getMe(token);

  // Vérifier que le rôle choisi correspond au rôle réel
  if (backendUser.role !== selectedRole) {
    throw new Error(
      "Le profil sélectionné ne correspond pas à votre compte. Veuillez choisir le bon profil."
    );
  }

  const user = formatUser(backendUser);
  const newSession = { token, user };

  try {
    sessionStorage.setItem(KEY, JSON.stringify(newSession));
  } catch {
    // Stockage indisponible
  }

  setSession(newSession);
  return user;
}, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Stockage indisponible
    }

    setSession(null);
  }, []);
const updateUser = useCallback((updatedBackendUser) => {
  setSession((current) => {
    if (!current) return current;

    const updatedSession = {
      ...current,
      user: formatUser(updatedBackendUser),
    };

    try {
      sessionStorage.setItem(KEY, JSON.stringify(updatedSession));
    } catch {
      // Stockage indisponible
    }

    return updatedSession;
  });
}, []);
  const value = useMemo(() => {
    const user = session?.user ?? null;

    return {
      user,
      token: session?.token ?? null,
      login,
      logout,
      updateUser,
      home: user ? ROLE_META[user.role]?.base ?? "/" : "/",
      isDemo: false,
    };
 }, [session, login, logout, updateUser]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
