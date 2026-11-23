
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../services/api";
import { useAuth } from "./AuthContext";

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let on = true;

    setItems(null);

    if (user) {
      api
        .getNotifications(user, token)
        .then((notifications) => {
          if (on) setItems(notifications);
        })
        .catch((error) => {
          console.error("Erreur chargement notifications:", error);
          if (on) setItems([]);
        });
    } else {
      setItems([]);
    }

    return () => {
      on = false;
    };
  }, [user, token]);

  const markRead = useCallback(
    async (id, read = true) => {
      if (!user) return;

      try {
        await api.markNotification(user, id, read, token);

        setItems((current) =>
          (current || []).map((n) =>
            n.id === id ? { ...n, read } : n
          )
        );
      } catch (error) {
        console.error("Erreur modification notification:", error);
      }
    },
    [user, token]
  );

  const markAll = useCallback(async () => {
    if (!user) return;

    try {
      await api.markAllNotifications(user, token);

      setItems((current) =>
        (current || []).map((n) => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error("Erreur lecture notifications:", error);
    }
  }, [user, token]);

  const remove = useCallback(
    async (id) => {
      if (!user) return;

      try {
        await api.removeNotification(user, id);

        setItems((current) =>
          (current || []).filter((n) => n.id !== id)
        );
      } catch (error) {
        console.error("Erreur suppression notification:", error);
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      items,
      loading: items === null,
      unread: (items || []).filter((n) => !n.read).length,
      markRead,
      markAll,
      remove,
    }),
    [items, markRead, markAll, remove]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useNotifications = () => useContext(Ctx);
