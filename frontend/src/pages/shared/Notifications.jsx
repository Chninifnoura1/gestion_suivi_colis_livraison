
import { useState } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  Eye,
  EyeOff,
  Trash2,
  Send,
} from "lucide-react";

import {
  PageHeader,
  Card,
  Tabs,
  EmptyState,
  Modal,
  Field,
  IconButton,
  Badge,
  Tooltip,
  Skeleton,
} from "../../components/ui";

import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import NotificationItem from "../../components/domain/NotificationItem";

import { useNotifications } from "../../context/NotificationsContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate } from "../../lib/router";

import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";

import {
  listCouriers,
  listSentNotifications,
  sendNotification,
} from "../../services/api";

import { fmtDateTime } from "../../lib/format";

function SendModal({ open, onClose, onSent }) {
  const { user } = useAuth();
  const toast = useToast();

  const { data: couriers } = useAsync(
    () => listCouriers(user),
    []
  );

  const form = useForm(
    { to: "Tous les livreurs", message: "" },
    {
      message: [
        rules.required("Écrivez le message à envoyer."),
        rules.min(5, "Message trop court."),
      ],
    }
  );

  const submit = form.submit(async (v) => {
    await sendNotification(user, v);
    toast.success("Notification envoyée", v.to);
    onSent();
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Envoyer une notification"
      description="Le destinataire la recevra dans son centre de notifications."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            icon={Send}
            loading={form.submitting}
            onClick={submit}
          >
            Envoyer
          </Button>
        </>
      }
    >
      <form className="stack-sm" onSubmit={submit} noValidate>
        <Field
          as="select"
          label="Destinataire"
          options={[
            "Tous les livreurs",
            ...(couriers || []).map((c) => c.name),
          ]}
          required
          {...form.field("to")}
        />

        <Field
          as="textarea"
          label="Message"
          rows={4}
          placeholder="Ex. Merci de passer à l'agence avant 9 h demain."
          required
          {...form.field("message")}
        />

        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    items,
    loading,
    unread,
    markRead,
    markAll,
    remove,
  } = useNotifications();

  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState("");
  const [send, setSend] = useState(false);

  const sent = useAsync(
    () =>
      user.role === "ADMIN"
        ? listSentNotifications(user)
        : Promise.resolve([]),
    []
  );

  const list = (items || []).filter(
    (n) =>
      (tab === "unread"
        ? !n.read
        : tab === "read"
          ? n.read
          : true) &&
      (!cat || n.category === cat)
  );

  const cats = [
    ...new Set((items || []).map((n) => n.category)),
  ];

  const tabs = [
    {
      id: "all",
      label: "Toutes",
      count: items?.length ?? 0,
    },
    {
      id: "unread",
      label: "Non lues",
      count: unread,
    },
    {
      id: "read",
      label: "Lues",
      count: (items?.length ?? 0) - unread,
    },
    ...(user.role === "ADMIN"
      ? [{ id: "sent", label: "Envoyées" }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread
            ? `${unread} non lue${unread > 1 ? "s" : ""} sur ${items?.length ?? 0}`
            : "Vous êtes à jour."
        }
        actions={
          <>
            {user.role === "ADMIN" && (
              <Button
                icon={Send}
                variant="secondary"
                onClick={() => setSend(true)}
              >
                Envoyer une notification
              </Button>
            )}

            <Button
              icon={CheckCheck}
              variant="secondary"
              disabled={!unread}
              onClick={markAll}
            >
              Tout marquer comme lu
            </Button>
          </>
        }
      />

      <div className="stack">
        <div className="row row-between">
          <Tabs
            items={tabs}
            value={tab}
            onChange={setTab}
          />

          {tab !== "sent" && (
            <label>
              <span className="sr-only">Catégorie</span>

              <select
                className="control"
                style={{ width: 190, height: 38 }}
                value={cat}
                onChange={(e) => setCat(e.target.value)}
              >
                <option value="">Toutes les catégories</option>

                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {tab === "sent" ? (
          <DataTable
            rows={sent.data}
            loading={sent.loading}
            caption="Notifications envoyées"
            searchPlaceholder="Rechercher…"
            searchText={(s) => `${s.to} ${s.message}`}
            columns={[
              {
                key: "to",
                header: "Destinataire",
                primary: true,
              },
              {
                key: "message",
                header: "Message",
              },
              {
                key: "at",
                header: "Envoyée le",
                sort: (s) => s.at,
                render: (s) => fmtDateTime(s.at),
              },
              {
                key: "read",
                header: "Statut",
                render: (s) => (
                  <Badge
                    tone={s.read ? "neutral" : "orange"}
                    dot
                  >
                    {s.read ? "Lue" : "Non lue"}
                  </Badge>
                ),
              },
            ]}
          />
        ) : (
          <Card flush>
            {loading ? (
              <div style={{ padding: 20 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    h={48}
                    style={{ marginBottom: 14 }}
                  />
                ))}
              </div>
            ) : !list.length ? (
              <EmptyState
                icon={tab === "unread" ? BellOff : Bell}
                title={
                  tab === "unread"
                    ? "Aucune notification non lue"
                    : "Aucune notification"
                }
                description="Les nouvelles notifications apparaîtront ici."
              />
            ) : (
              list.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                  actions={
                    <div className="notif-actions">
                      {(user.role !== "LIVREUR" || !n.read) && (
                        <Tooltip
                          label={
                            n.read
                              ? "Marquer comme non lue"
                              : "Marquer comme lue"
                          }
                        >
                          <IconButton
                            size="sm"
                            icon={n.read ? EyeOff : Eye}
                            label={
                              n.read
                                ? "Marquer comme non lue"
                                : "Marquer comme lue"
                            }
                            onClick={() =>
                              markRead(n.id, !n.read)
                            }
                          />
                        </Tooltip>
                      )}

                      {user.role !== "LIVREUR" && (
                        <Tooltip label="Supprimer">
                          <IconButton
                            size="sm"
                            icon={Trash2}
                            label="Supprimer la notification"
                            onClick={() => remove(n.id)}
                          />
                        </Tooltip>
                      )}
                    </div>
                  }
                />
              ))
            )}
          </Card>
        )}
      </div>

      {send && (
        <SendModal
          open
          onClose={() => setSend(false)}
          onSent={() => sent.reload(true)}
        />
      )}
    </>
  );
}
