/* ───────────────────────────── Couche service (maquette) ─────────────────────────────
   Chaque fonction ci-dessous correspond à un futur appel HTTP vers les microservices FastAPI.
   Les pages n'importent JAMAIS les données brutes : pour brancher le backend, il suffit de
   remplacer le corps de ces fonctions par des `fetch(...)`. Les règles de périmètre
   (ADMIN = son agence, LIVREUR = ses livraisons) sont appliquées ici comme elles devront
   l'être côté serveur — le front ne fait que refléter ces droits.

   ⚠️ Authentification factice : aucun jeton, aucune vérification réelle. */
import {
  AGENCIES, ADMINS, COURIERS, PARCELS, DELIVERIES, HISTORY, SUPER_USER, DEMO_NOW, DEMO,
} from "../data/seed";
import {
  createAdmin as createAdminAccount,
  updateAdmin as updateAdminAccount,
  createCourier as createCourierAccount,
  updateCourier as updateCourierAccount,
  listCouriers as listAuthCouriers,
  listAdmins as listAuthAdmins,
  listAgencies as listAuthAgencies,
  createAgency as createAgencyAccount,
  listActiveAgencies as listAuthActiveAgencies,
   getMe as getCurrentUser,
} from "./auth";
import { toInputDate } from "../lib/format";

const db = {
  agencies: AGENCIES.map((x) => ({ ...x })),
  admins: ADMINS.map((x) => ({ ...x })),
  couriers: COURIERS.map((x) => ({ ...x })),
  parcels: PARCELS.map((x) => ({ ...x, events: x.events.map((e) => ({ ...e })) })),
  deliveries: DELIVERIES.map((x) => ({ ...x, remarks: [] })),
  history: HISTORY.map((x) => ({ ...x })),
  notifications: {},
  sent: [],
};
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms + Math.random() * 150));
const clone = (v) => JSON.parse(JSON.stringify(v));
const H = 3600e3;
const nowIso = () => DEMO_NOW.toISOString();

export class ApiError extends Error { constructor(code, message) { super(message); this.code = code; } }

/* ───── Périmètres de données ───── */
const involves = (p, agencyId) => p.originAgencyId === agencyId || p.destAgencyId === agencyId;
const scopeParcels = (u) => (u.role === "SUPER_ADMIN" ? db.parcels : u.role === "ADMIN" ? db.parcels.filter((p) => involves(p, u.agencyId)) : db.parcels.filter((p) => p.courierId === u.id));
const scopeDeliveries = (u) => (u.role === "SUPER_ADMIN" ? db.deliveries : u.role === "ADMIN" ? db.deliveries.filter((d) => d.agencyId === u.agencyId) : db.deliveries.filter((d) => d.courierId === u.id));
const forbid = () => { throw new ApiError("FORBIDDEN", "Vous n'avez pas accès à cette ressource."); };
const agencyName = (id) => db.agencies.find((a) => a.id === id)?.name || "—";
const courierOf = (id) => db.couriers.find((c) => c.id === id);
const isLate = (p) => ["pending", "shipped", "in_transit", "arrived", "assigned", "out_for_delivery"].includes(p.status) && new Date(p.eta) < DEMO_NOW;

const decorate = (p) => ({
  ...p, late: isLate(p), originAgency: agencyName(p.originAgencyId), destAgency: agencyName(p.destAgencyId),
  courierName: courierOf(p.courierId)?.name || null,
});

/* ───── Statistiques réutilisables ───── */
function countBy(list, key) { return list.reduce((m, x) => ((m[x[key]] = (m[x[key]] || 0) + 1), m), {}); }
export function seriesFor(parcels, days) {
  const buckets = [], step = days > 30 ? 7 : 1, n = Math.ceil(days / step);
  for (let i = n - 1; i >= 0; i--) {
    const end = new Date(DEMO_NOW); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * step);
    const start = new Date(end); start.setDate(start.getDate() - step + 1); start.setHours(0, 0, 0, 0);
    const label = step === 1 ? `${start.getDate()}/${start.getMonth() + 1}` : `${start.getDate()}/${start.getMonth() + 1}`;
    const inRange = (iso) => { const t = new Date(iso); return t >= start && t <= end; };
    buckets.push({
      label,
      created: parcels.filter((p) => inRange(p.createdAt)).length,
      delivered: parcels.filter((p) => p.events.some((e) => e.status === "delivered" && inRange(e.at))).length,
    });
  }
  return buckets;
}
function summarize(parcels, deliveries) {
  const by = countBy(parcels, "status");
  const done = (by.delivered || 0), failed = (by.failed || 0);
  const todayStr = toInputDate(DEMO_NOW);
  return {
    total: parcels.length,
    today: parcels.filter((p) => toInputDate(p.createdAt) === todayStr).length,
    byStatus: by,
    pending: (by.pending || 0) + (by.shipped || 0),
    inTransit: (by.in_transit || 0) + (by.shipped || 0),
    arrived: by.arrived || 0,
    ongoing: (by.assigned || 0) + (by.out_for_delivery || 0),
    delivered: done, failed, cancelled: by.cancelled || 0,
    late: parcels.filter(isLate).length,
    anomalies: failed + parcels.filter(isLate).length,
    successRate: done + failed ? (done / (done + failed)) * 100 : 100,
    deliveries: deliveries.length,
  };
}
const courierStats = (c) => {
  const ds = db.deliveries.filter((d) => d.courierId === c.id);
  const done = ds.filter((d) => d.status === "delivered").length, failed = ds.filter((d) => d.status === "failed").length;
  const ongoing = ds.filter((d) => ["assigned", "out_for_delivery"].includes(d.status)).length;
  return { ...c, agency: agencyName(c.agencyId), total: ds.length, done, failed, ongoing, rate: done + failed ? (done / (done + failed)) * 100 : 100 };
};

/* ───────────────────────────── Authentification (factice) ───────────────────────────── */
export const DEMO_ACCOUNTS = {
  SUPER_ADMIN: { ...SUPER_USER },
  ADMIN: { id: "adm-aga", name: ADMINS[0].name, email: ADMINS[0].email, phone: ADMINS[0].phone, role: "ADMIN", agencyId: "ag-aga" },
  LIVREUR: { id: "liv-01", name: COURIERS[0].name, email: COURIERS[0].email, phone: COURIERS[0].phone, role: "LIVREUR", agencyId: "ag-aga" },
};
export async function login(role) { await wait(600); return clone(DEMO_ACCOUNTS[role]); }

/* ───────────────────────────── Suivi public (sans compte) ─────────────────────────────
   Ne renvoie QUE des informations non sensibles : aucun nom, téléphone, e-mail ni adresse de personne. */

const PUBLIC_TRACKING_STATUS = {
  CREE: "pending",
  EN_ATTENTE: "pending",
  PRIS_EN_CHARGE: "shipped",
  EN_COURS: "in_transit",
  ARRIVEE_A_L_AGENCE: "arrived",
  NOUVELLE_TENTATIVE: "assigned",
  ECHEC: "failed",
  LIVRE: "delivered",
};

export async function getTracking(code) {
  const trackingCode = String(code || "").trim().toUpperCase();

  try {
    const response = await fetch(
      `${COLIS_API}/api/colis/suivi/${encodeURIComponent(trackingCode)}`
    );

    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      throw new ApiError("NOT_FOUND", "Numéro de suivi introuvable.");
    }

    if (!response.ok) {
      throw new ApiError("NETWORK", data.detail || "Erreur de suivi.");
    }

    const mapStatus = (statusCode) =>
      PUBLIC_TRACKING_STATUS[statusCode] || "pending";

    const rawEvents = data.events || [];

    const events = rawEvents.length
      ? rawEvents.map((event) => ({
          status: mapStatus(event.status_code),
          at: event.at,
          city: event.city || "",
          note: "",
        }))
      : [
          {
            status: "pending",
            at: data.date_enregistrement,
            city: data.fromCity || "",
            note: "",
          },
        ];

    const currentStatus = mapStatus(data.status_code);

    return {
      id: data.numero_suivi,
      status: currentStatus,
      fromCity: data.fromCity || "—",
      toCity: data.toCity || "—",
      shipDate: data.date_enregistrement,
      eta: null,
      deliveredAt:
        events.find((event) => event.status === "delivered")?.at || null,
      events,
      priority: null,
      agency: data.agency
        ? {
            name: data.agency.name || "",
            phone: data.agency.phone || "",
            address: data.agency.address || "",
          }
        : null,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    throw new ApiError("NETWORK", "Connexion impossible au serveur.");
  }
}



const LIVRAISON_API = "http://localhost:8002";
const COLIS_API = "http://localhost:8003";
const STATUT_API = "http://localhost:5003";
const AUTH_API = "http://localhost:8001";

async function backendGet(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail || "Erreur lors de la récupération des données."
    );
  }

  return data;
}

async function backendPost(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail || "Erreur lors de l'enregistrement du colis."
    );
  }

  return data;
}
async function backendPatch(url, token, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail || "Erreur lors de la modification du colis."
    );
  }

  return data;
}
async function backendPut(url, token, body) {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail || "Erreur lors de la modification du profil."
    );
  }

  return data;
}
export async function getCourierCities(token) {
  return backendGet(`${AUTH_API}/auth/villes`, token);
}

export async function updateCourierCurrentCity(city, token) {
  return backendPut(
    `${AUTH_API}/auth/me/ville-actuelle`,
    token,
    { ville_actuelle: city }
  );
}
export async function updateMyProfile(profile, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendPut(
    `${AUTH_API}/auth/me/profile`,
    token,
    {
      prenom: profile.prenom,
      nom: profile.nom,
      email: profile.email,
      telephone: profile.telephone || null,
      matricule: profile.matricule || null,
    }
  );
}
export async function changeMyPassword(passwords, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendPut(
    `${AUTH_API}/auth/me/password`,
    token,
    {
      current_password: passwords.old,
      new_password: passwords.next,
      confirm_password: passwords.confirm,
    }
  );
}
export async function updateParcelStatus(colisId, code, token, details = {}) {
  return backendPost(
    `${STATUT_API}/api/v1/statuts/`,
    token,
    {
      colis_id: colisId,
      code,
      ...details,
    }
  );
}

export async function getCourier(user, id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  // Récupérer les vrais livreurs depuis Auth Service
  const couriers = await listAuthCouriers(token);

  const c = couriers.find((courier) => String(courier.id) === String(id));

  if (!c) {
    throw new ApiError(404, "Livreur introuvable.");
  }

  // Garder les statistiques et l'activité Mock si elles existent
  const mock = db.couriers.find(
    (courier) => String(courier.id) === String(id)
  );

  const stats = mock
    ? courierStats(mock)
    : {
        ongoing: 0,
        total: 0,
        done: 0,
        failed: 0,
        rate: 0,
      };

  return {
    ...stats,
    id: c.id,
    name: `${c.prenom} ${c.nom}`.trim(),
    firstName: c.prenom,
    lastName: c.nom,
    email: c.email,
    phone: c.telephone || "",
    matricule: c.matricule || "",
    agencyId: c.agence_id,
    villeActuelle: c.ville_actuelle || "",
    peutTransport: Boolean(c.peut_transport),
    peutLivrerClient: Boolean(c.peut_livrer_client),
    available: Boolean(c.disponible),
    active: Boolean(c.is_active),

    deliveries: mock
      ? db.deliveries
          .filter((d) => d.courierId === id)
          .map(decorateDelivery)
          .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
      : [],

    activity: mock
      ? db.history.filter((h) => h.courierId === id).slice(0, 10)
      : [],
  };
}


/* ───────────────────────────── Tableaux de bord ───────────────────────────── */

async function getCourierDashboard(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const [livraisons, currentUser] = await Promise.all([
    backendGet(`${LIVRAISON_API}/api/livraisons/`, token),
    getCurrentUser(token),
  ]);

  const hasActiveRoute = livraisons.some(
    (livraison) =>
      livraison.type_mission === "TRANSPORT_INTER_AGENCES" &&
      ["EN_ATTENTE", "EN_TRANSIT"].includes(livraison.etat_livraison)
  );

  const statusMap = {
    EN_ATTENTE: "assigned",
    EN_TRANSIT: "out_for_delivery",
    ARRIVEE_A_L_AGENCE: "out_for_delivery",
    LIVREE: "delivered",
  };

  const missions = [];

  for (const livraison of livraisons) {
    const associations = await backendGet(
      `${LIVRAISON_API}/api/livraisons/${livraison.id}/colis`,
      token
    );

    for (const association of associations) {
      const colis = await backendGet(
        `${COLIS_API}/api/colis/${association.colis_id}`,
        token
      );

      const recipient = {
        name: colis.destinataire_nom || "Transport inter-agences",
        phone: colis.destinataire_telephone || "",
        address: colis.destinataire_adresse || livraison.ville_arrivee,
        city: colis.destinataire_ville || livraison.ville_arrivee,
      };

      missions.push({
        id: livraison.id,
        parcelId: colis.id,
        status: statusMap[livraison.etat_livraison] || "assigned",
        assignedAt: livraison.created_at,
        completedAt: livraison.date_arrivee_reelle,
        parcel: {
          id: colis.id,
          numero_suivi: colis.numero_suivi,
          fromCity: livraison.ville_depart,
          toCity: livraison.ville_arrivee,
          recipient,
        },
      });
    }
  }

  missions.sort(
    (a, b) => new Date(b.assignedAt) - new Date(a.assignedAt)
  );

  // Semaine actuelle : du lundi au dimanche
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const isInCurrentWeek = (date) => {
    if (!date) return false;
    const value = new Date(date);
    return value >= weekStart && value < nextWeekStart;
  };

  const weekMissions = missions.filter(
    (m) => isInCurrentWeek(m.assignedAt) || isInCurrentWeek(m.completedAt)
  );

  const doneThisWeek = weekMissions.filter(
    (m) => m.status === "delivered" && isInCurrentWeek(m.completedAt)
  ).length;
  const done = missions.filter((m) => m.status === "delivered").length;
  const waiting = missions.filter((m) => m.status === "assigned").length;
  const ongoing = missions.filter(
    (m) => m.status === "out_for_delivery"
  ).length;

  return {
    available: Boolean(currentUser.disponible),
    hasActiveRoute,
    today: weekMissions.length,
    waiting,
    ongoing,
    done: doneThisWeek,
    totals: {
      total: missions.length,
      rate: missions.length ? (done / missions.length) * 100 : 0,
    },
    next:
      missions.find((m) => m.status !== "delivered") || null,
    activity: [],
  };
}

export async function getDashboard(user, tokenOrDays = 30, days = 30) {
  if (user.role === "LIVREUR") {
    return getCourierDashboard(user, tokenOrDays);
  }

  const token = typeof tokenOrDays === "string" ? tokenOrDays : null;
  const period = typeof tokenOrDays === "number" ? tokenOrDays : days;

if (user.role === "ADMIN") {
  const [dashboard, latestRoutes] = await Promise.all([
    backendGet(
      `${LIVRAISON_API}/api/dashboard/admin?days=${period}`,
      token
    ),
    backendGet(
      `${LIVRAISON_API}/api/livraisons/admin/trajets?limit=5`,
      token
    ),
  ]);

  return {
    ...dashboard,
    latestRoutes,
  };
}
  if (user.role === "ADMIN") {
  return backendGet(
    `${LIVRAISON_API}/api/dashboard/admin?days=${period}`,
    token
  );
}

  await wait();
  const parcels = scopeParcels(user), deliveries = scopeDeliveries(user);
  const stats = summarize(parcels, deliveries);
  const base = { stats, series: seriesFor(parcels, period), statusMix: stats.byStatus };
  if (user.role === "SUPER_ADMIN") {
    const agencies = db.agencies.map((a) => {
      const ps = db.parcels.filter((p) => involves(p, a.id)); const s = summarize(ps, []);
      return { id: a.id, name: a.name, city: a.city, active: a.active, total: s.total, delivered: s.delivered, late: s.late, rate: s.successRate };
    });
    return {
      ...base, agencies,
      counts: { agencies: db.agencies.length, activeAgencies: db.agencies.filter((a) => a.active).length, users: db.admins.length + db.couriers.length + 1, admins: db.admins.length, couriers: db.couriers.length },
      activity: db.history.slice(0, 7).map((h) => ({ ...h, agency: agencyName(h.originAgencyId) })),
    };
  }
  if (user.role === "ADMIN") {
    const couriers = db.couriers.filter((c) => c.agencyId === user.agencyId).map(courierStats);
    return {
      ...base, couriers, activity: db.history.filter((h) => h.originAgencyId === user.agencyId || h.destAgencyId === user.agencyId).slice(0, 8),
      latestParcels: [...parcels].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map(decorate),
      latestDeliveries: [...deliveries].sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt)).slice(0, 5).map(decorateDelivery),
      availability: { available: couriers.filter((c) => c.available && c.active).length, total: couriers.length },
    };
  }
  /* Livreur */
  const mine = deliveries.map(decorateDelivery);
  const todayStr = toInputDate(DEMO_NOW);
  const active = mine.filter((d) => ["assigned", "out_for_delivery"].includes(d.status));
  const doneToday = mine.filter((d) => d.status === "delivered" && d.completedAt && toInputDate(d.completedAt) === todayStr);
  const next = [...active].sort((a, b) => (a.status === "out_for_delivery" ? -1 : 1) - (b.status === "out_for_delivery" ? -1 : 1) || (a.parcel.priority === "express" ? -1 : 1))[0] || null;
  return {
    today: active.length + doneToday.length, waiting: active.filter((d) => d.status === "assigned").length,
    ongoing: active.filter((d) => d.status === "out_for_delivery").length, done: doneToday.length, next,
    activity: db.history.filter((h) => h.courierId === user.id).slice(0, 5), available: courierOf(user.id).available,
    totals: courierStats(courierOf(user.id)),
  };
}

/* ───────────────────────────── Colis ───────────────────────────── */

export async function listParcels(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const data = await backendGet(`${COLIS_API}/api/colis/`, token);
  const parcels = Array.isArray(data) ? data : data.items || [];

  const statusMap = {
    CREE: "pending",
    EN_ATTENTE: "pending",
    PRIS_EN_CHARGE: "assigned",
    EN_COURS: "out_for_delivery",
    ECHEC: "failed",
    NOUVELLE_TENTATIVE: "pending",
    LIVRE: "delivered",
  };

  return Promise.all(
    parcels.map(async (p) => {
      let status = "pending";

      try {
        const currentStatus = await backendGet(
          `${STATUT_API}/api/v1/statuts/colis/${p.id}/actuel`,
          token
        );

        status = statusMap[currentStatus.code] || "pending";
      } catch (error) {
        if (error.code !== 404) {
          throw error;
        }
      }

      return {
        id: p.id,
        trackingNumber: p.numero_suivi,
        createdAt: p.date_enregistrement,
        originAgency: user.agency?.name || "Agence d'origine",
        destAgency: p.destinataire_ville || "—",
        status,
        canModify: p.can_modify,
        priority: "standard",
        late: false,
        fromCity: p.expediteur_ville,
        toCity: p.destinataire_ville,
        sender: {
          name: p.expediteur_nom,
          phone: p.expediteur_telephone,
          email: "",
          address: p.expediteur_adresse,
          city: p.expediteur_ville,
        },
        recipient: {
          name: p.destinataire_nom,
          phone: p.destinataire_telephone,
          email: p.destinataire_email || "",
          address: p.destinataire_adresse,
          city: p.destinataire_ville,
        },
        content: p.description || "",
        weight: p.poids,
        type: "",
        dims: [],
        notes: "",
        shipDate: null,
        eta: null,
        delivery: null,
        courierName: null,
      };
    })
  );
}

export async function getParcel(user, id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const p = await backendGet(`${COLIS_API}/api/colis/${id}`, token);
let currentStatusCode = "CREE";

try {
  const currentStatus = await backendGet(
    `${STATUT_API}/api/v1/statuts/colis/${id}/actuel`,
    token
  );

 currentStatusCode = currentStatus.code;
} catch (error) {
  if (error.code !== 404) {
    throw error;
  }
}
  const createdAt = p.date_enregistrement;

  return {
    id: p.id,
    canModify: p.can_modify,
    trackingNumber: p.numero_suivi,
    createdAt,
    originAgency: user.agency?.name || "Agence d'origine",
    destAgency: p.destinataire_ville || "—",

    status: currentStatusCode,
    priority: "standard",
    late: false,

    fromCity: p.expediteur_ville,
    toCity: p.destinataire_ville,

    sender: {
      name: p.expediteur_nom,
      phone: p.expediteur_telephone,
      email: "",
      address: p.expediteur_adresse,
      city: p.expediteur_ville,
    },

    recipient: {
      name: p.destinataire_nom,
      phone: p.destinataire_telephone,
      email: p.destinataire_email || "",
      address: p.destinataire_adresse,
      city: p.destinataire_ville,
    },

    content: p.description || "",
    weight: p.poids,
    type: "",
    dims: [],
    notes: "",

    shipDate: null,
    eta: null,
    delivery: null,
    courierName: null,

    events: [
      {
        status: currentStatusCode,
        at: createdAt,
        city: p.expediteur_ville,
        by: user.name || "",
        note: "Colis enregistré",
      },
    ],
    history: [],
  };
}
export async function saveParcel(user, data, id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

if (id) {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Accès refusé.");
  }

  const payload = {
    description: data.content.trim(),
    poids: Number(data.weight),

    expediteur_nom: data.senderName.trim(),
    expediteur_telephone: data.senderPhone.trim(),
    expediteur_adresse: data.senderAddress.trim(),
    expediteur_ville: data.senderCity.trim(),

    destinataire_nom: data.recipientName.trim(),
    destinataire_telephone: data.recipientPhone.trim(),
    destinataire_email: data.recipientEmail?.trim() || null,
    destinataire_adresse: data.recipientAddress.trim(),
    destinataire_ville: data.recipientCity.trim(),
  };

  return backendPatch(`${COLIS_API}/api/colis/${id}`, token, payload);
}

  if (user.role !== "ADMIN") {
    throw new ApiError(
      403,
      "Seul un administrateur d'agence peut créer un colis depuis ce formulaire."
    );
  }

  const payload = {
    description: data.content.trim(),
    poids: Number(data.weight),

    expediteur_nom: data.senderName.trim(),
    expediteur_telephone: data.senderPhone.trim(),
    expediteur_adresse: data.senderAddress.trim(),
    expediteur_ville: data.senderCity.trim(),

    destinataire_nom: data.recipientName.trim(),
    destinataire_telephone: data.recipientPhone.trim(),
    destinataire_email: data.recipientEmail?.trim() || null,
    destinataire_adresse: data.recipientAddress.trim(),
    destinataire_ville: data.recipientCity.trim(),
  };

  return backendPost(`${COLIS_API}/api/colis/`, token, payload);
}
export async function cancelParcel(user, id) {
  await wait(700);
  const p = db.parcels.find((x) => x.id === id);
  if (!p || !scopeParcels(user).includes(p)) forbid();
  p.status = "cancelled";
  p.events.push({ status: "cancelled", at: nowIso(), city: p.fromCity, by: user.name, note: "Annulé par l'agence" });
  db.history.unshift({ id: `${id}-c${Date.now()}`, parcelId: id, from: "pending", to: "cancelled", at: nowIso(), by: user.name, note: "Annulé par l'agence", originAgencyId: p.originAgencyId, destAgencyId: p.destAgencyId, courierId: null });
}

/* ───────────────────────────── Clients (contacts sans compte) ───────────────────────────── */
function contactsFor(user) {
  const map = new Map();
  scopeParcels(user).forEach((p) => {
    [["Expéditeur", p.sender], ["Destinataire", p.recipient]].forEach(([role, c]) => {
      const key = c.phone;
      const cur = map.get(key) || { id: c.id || key.replace(/\s/g, ""), name: c.name, phone: c.phone, email: c.email, city: c.city, address: c.address, sent: 0, received: 0, parcels: [] };
      if (role === "Expéditeur") cur.sent++; else cur.received++;
      cur.parcels.push({ ...decorate(p), role });
      map.set(key, cur);
    });
  });
  return [...map.values()].map((c) => ({ ...c, count: c.parcels.length, last: c.parcels.reduce((m, p) => (p.createdAt > m ? p.createdAt : m), "") }));
}
export async function listContacts(user) { await wait(); return contactsFor(user).sort((a, b) => b.last.localeCompare(a.last)); }
export async function getContact(user, id) {
  await wait(400);
  const c = contactsFor(user).find((x) => x.id === id);
  if (!c) throw new ApiError("NOT_FOUND", "Contact introuvable.");
  return c;
}

/* ───────────────────────────── Livreurs ───────────────────────────── */
function decorateDelivery(d) {
  const parcel = db.parcels.find((p) => p.id === d.parcelId);
  return { ...d, parcel: decorate(parcel), courierName: courierOf(d.courierId)?.name || "—", late: isLate(parcel) };
}
export async function listCouriers(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const couriers = await listAuthCouriers(token);

  return couriers.map((c) => ({
    id: c.id,
    name: `${c.prenom} ${c.nom}`.trim(),
    firstName: c.prenom,
    lastName: c.nom,
    email: c.email,
    phone: c.telephone || "",
    matricule: c.matricule || "",
    agencyId: c.agence_id,
    villeActuelle: c.ville_actuelle || "",
    peutTransport: Boolean(c.peut_transport),
    peutLivrerClient: Boolean(c.peut_livrer_client),
    available: Boolean(c.disponible),
    active: Boolean(c.is_active),
    ongoing: 0,
    total: 0,
    done: 0,
    failed: 0,
    rate: 0,
  }));
}


export async function saveCourier(user, data, id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const payload = {
    nom: data.lastName.trim(),
    prenom: data.firstName.trim(),
    email: data.email.trim(),
    telephone: data.phone?.trim() || null,
    disponible: data.available === "Disponible",
    is_active: data.active === "Actif",
    peut_transport: Boolean(data.peut_transport),
    peut_livrer_client: Boolean(data.peut_livrer_client),
  };

  if (id) {
    return updateCourierAccount(token, id, payload);
  }

  return createCourierAccount(token, {
    ...payload,
    password: data.password,
  });
}

export async function toggleCourierActive(user, id) {
  await wait(500);
  const c = db.couriers.find((x) => x.id === id);
  if (!c || (user.role === "ADMIN" && c.agencyId !== user.agencyId)) forbid();
  c.active = !c.active; return courierStats(c);
}
export async function setAvailability(user, available, token) {
  if (user?.role === "LIVREUR") {
    if (!token) {
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }

    const updatedUser = await backendPut(
      `${AUTH_API}/auth/me/disponibilite`,
      token,
      { disponible: available }
    );

    return updatedUser;
  }

  await wait(350);
  courierOf(user.id).available = available;
  return available;
}

/* ───────────────────────────── Affectation & livraisons ───────────────────────────── */

export async function getRouteAssignmentData(user, token) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Accès réservé à l'administrateur.");
  }

  const [agencies, couriers] = await Promise.all([
    listAuthActiveAgencies(token),
    backendGet(
      `${LIVRAISON_API}/api/livraisons/livreurs-transport`,
      token
    ),
  ]);

  return {
    agencies: agencies.map((agency) => ({
      id: agency.id,
      name: agency.nom_agence,
      city: agency.ville,
    })),
    couriers: couriers.map((courier) => ({
      ...courier,
      name: courier.email,
      active: true,
      available: courier.disponible,
    })),
  };
}

export async function createMultiStageRoute(
  user,
  { courierId, agencyIds },
  token
) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Accès réservé à l'administrateur.");
  }

  return backendPost(
    `${LIVRAISON_API}/api/livraisons/affectation-multi-etapes`,
    token,
    {
      livreur_id: courierId,
      agence_ids: agencyIds,
    }
  );
}

export async function getParcelLoadingData(user, token) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Accès réservé à l'administrateur.");
  }

  const [routes, parcels] = await Promise.all([
    backendGet(
      `${LIVRAISON_API}/api/livraisons/chargement-colis`,
      token
    ),
    backendGet(
      `${COLIS_API}/api/colis/transport-inter-agences`,
      token
    ),
  ]);

  return { routes, parcels };
}

export async function addParcelsToRoute(
  user,
  livraisonId,
  colisIds,
  token
) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Accès réservé à l'administrateur.");
  }

  if (!livraisonId || !Array.isArray(colisIds) || colisIds.length === 0) {
    throw new ApiError(400, "Sélectionnez au moins un colis.");
  }

  return backendPost(
    `${LIVRAISON_API}/api/livraisons/${livraisonId}/etapes/colis`,
    token,
    { colis_ids: colisIds }
  );
}
export async function getParcelReceptionData(user, token) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Accès réservé à l'administrateur.");
  }

  return backendGet(
    `${LIVRAISON_API}/api/livraisons/reception-inter-agences`,
    token
  );
}

export async function confirmRouteStageReception(
  user,
  livraisonId,
  agenceId,
  token
) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Accès réservé à l'administrateur.");
  }

  if (!livraisonId || !agenceId) {
    throw new ApiError(400, "Livraison ou agence invalide.");
  }

  return backendPost(
    `${LIVRAISON_API}/api/livraisons/${livraisonId}/etapes/${agenceId}/confirmer-reception`,
    token,
    {}
  );
}

export async function listMyRoutes(token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendGet(
    `${LIVRAISON_API}/api/livraisons/mes-trajets`,
    token
  );
}

export async function declareRouteArrival(livraisonId, agenceId, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendPost(
    `${LIVRAISON_API}/api/livraisons/${livraisonId}/etapes/${agenceId}/arrivee`,
    token,
    {}
  );
}
export async function startRoute(livraisonId, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendPost(
    `${LIVRAISON_API}/api/livraisons/${livraisonId}/demarrer`,
    token,
    {}
  );
}
export async function listDeliveries(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  if (user.role === "ADMIN") {
    return backendGet(
      `${LIVRAISON_API}/api/livraisons/admin`,
      token
    );
  }

  if (user.role === "LIVREUR") {
    const livraisons = await backendGet(
      `${LIVRAISON_API}/api/livraisons/`,
      token
    );

    const statusMap = {
      CREE: "assigned",
      EN_ATTENTE: "assigned",
      PRIS_EN_CHARGE: "out_for_delivery",
      EN_TRANSIT: "out_for_delivery",
      EN_COURS: "out_for_delivery",
      ARRIVEE_A_L_AGENCE: "out_for_delivery",
      NOUVELLE_TENTATIVE: "assigned",
      LIVRE: "delivered",
      LIVREE: "delivered",
      ECHEC: "failed",
    };

    const deliveries = await Promise.all(
      livraisons.map(async (livraison) => {
        const associations = await backendGet(
          `${LIVRAISON_API}/api/livraisons/${livraison.id}/colis`,
          token
        );

        return Promise.all(
          associations.map(async (association) => {
            const colis = await backendGet(
              `${COLIS_API}/api/colis/${association.colis_id}`,
              token
            );

            let currentStatusCode = livraison.etat_livraison;

            try {
              const currentStatus = await backendGet(
                `${STATUT_API}/api/v1/statuts/colis/${colis.id}/actuel`,
                token
              );

              currentStatusCode = currentStatus.code;
            } catch (error) {
              if (error.code !== 404) {
                throw error;
              }
            }

            return {
              id: livraison.id,
              parcelId: colis.id,
              missionType: livraison.type_mission,
              missionStatus: livraison.etat_livraison,
              status: statusMap[currentStatusCode] || "assigned",
              currentStatus: currentStatusCode,
              assignedAt: livraison.created_at,
              completedAt: livraison.date_arrivee_reelle,
              failure: null,
              history: [],
              parcel: {
                id: colis.id,
                numero_suivi: colis.numero_suivi,
                content: colis.description || "Non renseigné",
                description: colis.description || "Non renseigné",
                weight: colis.poids,
                priority: "normal",
                fromCity: livraison.ville_depart,
                toCity: livraison.ville_arrivee,
                eta: livraison.date_arrivee_prevue,
                recipient: {
                  name: colis.destinataire_nom,
                  phone: colis.destinataire_telephone,
                  address: colis.destinataire_adresse,
                  city: colis.destinataire_ville,
                },
                sender: {
                  name: colis.expediteur_nom,
                  phone: colis.expediteur_telephone,
                  address: colis.expediteur_adresse,
                  city: colis.expediteur_ville,
                },
                events: [],
              },
            };
          })
        );
      })
    );

    return deliveries
      .flat()
      .sort(
        (a, b) =>
          new Date(b.assignedAt) - new Date(a.assignedAt)
      );
  }

  throw new ApiError(403, "Accès non autorisé.");
}


export async function confirmReception(user, deliveryId, token) {
  if (user?.role !== "ADMIN" || !token) {
    throw new ApiError(403, "Action réservée à l'administrateur.");
  }

  return backendPost(
    `${LIVRAISON_API}/api/livraisons/${deliveryId}/confirmer-reception`,
    token,
    {}
  );
}
export async function getDelivery(user, key, token) {

  // Admin : récupérer la vraie mission depuis le backend
  if (user.role === "ADMIN") {
    if (!token) {
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }

    const livraison = await backendGet(
      `${LIVRAISON_API}/api/livraisons/${key}`,
      token
    );

    const associations = await backendGet(
      `${LIVRAISON_API}/api/livraisons/${key}/colis`,
      token
    );

    if (!associations || associations.length === 0) {
      throw new ApiError("NOT_FOUND", "Aucun colis trouvé dans cette livraison.");
    }

    const couriers = await listAuthCouriers(token).catch(() => []);
    const courier = couriers.find(
      (c) => String(c.id) === String(livraison.livreur_id)
    );

    const statusMap = {
      CREE: "assigned",
      EN_ATTENTE: "assigned",
      PRIS_EN_CHARGE: "out_for_delivery",
      EN_COURS: "out_for_delivery",
      ARRIVEE_A_L_AGENCE: "out_for_delivery",
      NOUVELLE_TENTATIVE: "assigned",
      LIVRE: "delivered",
      ECHEC: "failed",
    };

    const parcels = await Promise.all(
      associations.map(async (association) => {
        const colis = await backendGet(
          `${COLIS_API}/api/colis/${association.colis_id}`,
          token
        );

        let currentStatusCode = livraison.etat_livraison;

        try {
          const currentStatus = await backendGet(
            `${STATUT_API}/api/v1/statuts/colis/${colis.id}/actuel`,
            token
          );
          currentStatusCode = currentStatus.code;
        } catch (error) {
          if (error.code !== 404) throw error;
        }

        return {
          id: colis.id,
          numero_suivi: colis.numero_suivi,
          content: colis.description || "Non renseigné",
          description: colis.description || "Non renseigné",
          weight: colis.poids,
          status: statusMap[currentStatusCode] || "assigned",
          currentStatus: currentStatusCode,
          fromCity: livraison.ville_depart,
          toCity: livraison.ville_arrivee,
          originAgency: livraison.ville_depart,
          destAgency: livraison.ville_arrivee,
          eta: livraison.date_arrivee_prevue,
          recipient: {
            name: colis.destinataire_nom,
            phone: colis.destinataire_telephone,
            address: colis.destinataire_adresse,
            city: colis.destinataire_ville,
          },
          sender: {
            name: colis.expediteur_nom,
            phone: colis.expediteur_telephone,
            address: colis.expediteur_adresse,
            city: colis.expediteur_ville,
          },
          events: [],
        };
      })
    );

    const firstParcel = parcels[0];

    return {
      id: livraison.id,
      parcelId: firstParcel.id,
      parcels,
      missionType: livraison.type_mission,
      missionStatus: livraison.etat_livraison,
      status: firstParcel.status,
      currentStatus: firstParcel.currentStatus,
      courierName: courier
        ? `${courier.prenom} ${courier.nom}`.trim()
        : "Livreur",
      courier: {
        matricule: courier?.matricule || "",
        phone: courier?.telephone || "",
      },
      assignedAt: livraison.created_at,
      startedAt: livraison.date_depart,
      completedAt: livraison.date_arrivee_reelle,
      late: false,
      failure: null,
      remarks: [],
      receiver: null,
      history: [],
      parcel: firstParcel,
    };
  }

  // Livreurs : données réelles depuis le backend
  if (user.role === "LIVREUR") {
    if (!token) {
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }

    const livraisons = await backendGet(
      `${LIVRAISON_API}/api/livraisons/`,
      token
    );

    for (const livraison of livraisons) {
      const associations = await backendGet(
        `${LIVRAISON_API}/api/livraisons/${livraison.id}/colis`,
        token
      );

      const association = associations.find(
        (item) => item.colis_id === key
      );

      if (!association) continue;

      const colis = await backendGet(
        `${COLIS_API}/api/colis/${association.colis_id}`,
        token
      );

            // Récupérer le statut réel et actuel du colis
            let currentStatusCode = livraison.etat_livraison;

            try {
              const currentStatus = await backendGet(
                `${STATUT_API}/api/v1/statuts/colis/${colis.id}/actuel`,
                token
              );

              currentStatusCode = currentStatus.code;
            } catch (error) {
              if (error.code !== 404) {
                throw error;
              }
            }

            const statusMap = {
              CREE: "assigned",
              EN_ATTENTE: "assigned",
              PRIS_EN_CHARGE: "out_for_delivery",
              EN_COURS: "out_for_delivery",
              ARRIVEE_A_L_AGENCE: "out_for_delivery",
              NOUVELLE_TENTATIVE: "assigned",
              LIVRE: "delivered",
              ECHEC: "failed",
            };

      return {
        id: livraison.id,
        parcelId: colis.id,
        missionType: livraison.type_mission,
        missionStatus: livraison.etat_livraison,
        status: statusMap[currentStatusCode] || "assigned",
        currentStatus: currentStatusCode,
        assignedAt: livraison.created_at,
        completedAt: livraison.date_arrivee_reelle,
        failure: null,
        history: [],
        parcel: {
          id: colis.id,
          numero_suivi: colis.numero_suivi,
          content: colis.description || "Non renseigné",
          description: colis.description || "Non renseigné",
          weight: colis.poids,
          fromCity: livraison.ville_depart,
          toCity: livraison.ville_arrivee,
          eta: livraison.date_arrivee_prevue,
          recipient: {
            name: colis.destinataire_nom,
            phone: colis.destinataire_telephone,
            address: colis.destinataire_adresse,
            city: colis.destinataire_ville,
          },
          sender: {
            name: colis.expediteur_nom,
            phone: colis.expediteur_telephone,
            address: colis.expediteur_adresse,
            city: colis.expediteur_ville,
          },
          events: [],
        },
      };
    }

    throw new ApiError("NOT_FOUND", "Livraison introuvable pour ce colis.");
  }

  // Autres rôles : conserver le comportement Mock existant
  await wait(400);

  const d = db.deliveries.find(
    (x) => x.id === key || x.parcelId === key
  );

  if (!d) throw new ApiError("NOT_FOUND", "Livraison introuvable.");
  if (!scopeDeliveries(user).includes(d)) forbid();

  return {
    ...decorateDelivery(d),
    history: db.history
      .filter((h) => h.parcelId === d.parcelId)
      .sort((a, b) => new Date(b.at) - new Date(a.at)),
    courier: courierOf(d.courierId),
  };
}

export async function addRemark(user, deliveryId, text) {
  await wait(500);
  const d = db.deliveries.find((x) => x.id === deliveryId);
  if (!d || !scopeDeliveries(user).includes(d)) forbid();
  d.remarks.unshift({ id: `r${Date.now()}`, text, by: user.name, at: nowIso() });
}

/* Actions du livreur — transitions autorisées : assigned → out_for_delivery → delivered | failed */
function transition(user, parcelId, to, note, extra = {}) {
  const d = db.deliveries.find((x) => x.parcelId === parcelId), p = db.parcels.find((x) => x.id === parcelId);
  if (!d || d.courierId !== user.id) forbid();
  const allowed = { assigned: ["out_for_delivery"], out_for_delivery: ["delivered", "failed"] };
  if (!allowed[p.status]?.includes(to)) throw new ApiError("INVALID_TRANSITION", "Ce changement de statut n'est pas autorisé.");
  const prev = p.status; p.status = to; d.status = to;
  p.events.push({ status: to, at: nowIso(), city: p.toCity, by: user.name, note: note || "" });
  db.history.unshift({ id: `${parcelId}-t${Date.now()}`, parcelId, from: prev, to, at: nowIso(), by: user.name, note: note || "", originAgencyId: p.originAgencyId, destAgencyId: p.destAgencyId, courierId: user.id });
  if (to === "out_for_delivery") d.startedAt = nowIso();
  else d.completedAt = nowIso();
  Object.assign(d, extra);
}

export async function startDelivery(user, parcelId, token) {
  if (user.role === "LIVREUR") {
    if (!token) {
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }

    const delivery = await getDelivery(user, parcelId, token);

    return backendPatch(
      `${LIVRAISON_API}/api/livraisons/${delivery.id}/statut`,
      token,
      { etat_livraison: "EN_TRANSIT" }
    );
  }

  await wait(600);
  transition(user, parcelId, "out_for_delivery");
}

export async function arriveAtAgency(user, parcelId, token) {
  if (user.role !== "LIVREUR" || !token) {
    throw new ApiError(401, "Session invalide.");
  }

  const delivery = await getDelivery(user, parcelId, token);

  if (delivery.missionType !== "TRANSPORT_INTER_AGENCES") {
    throw new ApiError(403, "Cette action est réservée au transport inter-agences.");
  }

  if (delivery.missionStatus !== "EN_TRANSIT") {
    throw new ApiError(409, "La mission de transport n'est pas en cours.");
  }

  // Enregistrer d'abord l'arrivée du colis dans l'historique.
  await updateParcelStatus(parcelId, "ARRIVEE_A_L_AGENCE", token, {
    commentaire: "Colis arrivé à l'agence de destination.",
  });

  // Ensuite, clôturer l'étape de transport.
  return backendPatch(
    `${LIVRAISON_API}/api/livraisons/${delivery.id}/statut`,
    token,
    { etat_livraison: "ARRIVEE_A_L_AGENCE" }
  );
}

export async function confirmDelivery(user, parcelId, form, token) {
  if (user.role === "LIVREUR") {
    if (!token) {
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }


      const delivery = await getDelivery(user, parcelId, token);

      if (delivery.missionType !== "LIVRAISON_CLIENT") {
        throw new ApiError(
          403,
          "Cette action est réservée à la livraison au client."
        );
      }

      if (delivery.missionStatus !== "EN_TRANSIT") {
        throw new ApiError(409, "La livraison n'est pas en cours.");
      }

      // Enregistrer d'abord le statut du colis.
      await updateParcelStatus(parcelId, "LIVRE", token, {
        commentaire: form.remark || "Livraison confirmée par le livreur.",
      });

      // Ensuite, clôturer la mission.
      return backendPatch(
        `${LIVRAISON_API}/api/livraisons/${delivery.id}/statut`,
        token,
        {
          etat_livraison: "LIVREE",
          date_arrivee_reelle: new Date().toISOString(),
        }
      );

  }

  await wait(1000);
  transition(user, parcelId, "delivered", form.remark, {
    receiver: { name: form.receiver, relation: form.relation },
  });
}

export async function reportProblem(user, parcelId, form, token) {

if (user.role === "LIVREUR") {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const delivery = await getDelivery(user, parcelId, token);

  if (delivery.missionType !== "LIVRAISON_CLIENT") {
    throw new ApiError(
      403,
      "Seul le livreur chargé de la livraison au client peut signaler un échec."
    );
  }

  if (delivery.missionStatus !== "EN_TRANSIT") {
    throw new ApiError(409, "La livraison n'est pas en cours.");
  }

  return updateParcelStatus(parcelId, "ECHEC", token, {
    motif_echec: form.reason,
    commentaire: form.comment || form.reason,
  });
}


  await wait(1000);
  transition(user, parcelId, "failed", form.reason, {
    failure: {
      reason: form.reason,
      comment: form.comment,
      at: nowIso(),
    },
  });
}


/* ───────────────────────────── Historique ───────────────────────────── */

/* Historique */
export async function listHistory(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendGet(
    `${LIVRAISON_API}/api/dashboard/history`,
    token
  );
}


/* ───────────────────────────── Super-admin : agences & administrateurs ───────────────────────────── */
export async function listAgencies(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const agencies = await listAuthAgencies(token);

  return agencies.map((a) => ({
    id: a.id,
    name: a.nom_agence,
    city: a.ville,
    address: a.adresse || "",
    phone: a.telephone || "",
    active: Boolean(a.is_active),
    admin: a.admin || null,
    couriers: 0,
    users: 0,
    parcels: 0,
    delivered: 0,
    late: 0,
    rate: 0,
    createdAt: a.created_at,
  }));
}
export async function getAgency(id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  return backendGet(
    `${LIVRAISON_API}/api/dashboard/agency/${id}`,
    token
  );
}
export async function saveAgency(data, id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const payload = {
    nom_agence: data.name.trim(),
    ville: data.city.trim(),
    adresse: data.address?.trim() || null,
    telephone: data.phone?.trim() || null,
  };

  if (id) {
    return backendPut(
      `${AUTH_API}/auth/agencies/${id}`,
      token,
      payload
    );
  }

  return createAgencyAccount(token, payload);
}

export async function toggleAgency(id) {
  await wait(500);
  const a = db.agencies.find((x) => x.id === id); a.active = !a.active; return a.active;
}
export async function listAdmins(user, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const admins = await listAuthAdmins(token);

  return admins.map((a) => ({
    id: a.id,
    name: `${a.prenom} ${a.nom}`.trim(),
    firstName: a.prenom,
    lastName: a.nom,
    email: a.email,
    createdAt: a.created_at,
    phone: a.telephone || "",
    agencyId: a.agence_id,
    agency: a.agence
      ? `${a.agence.nom_agence} - ${a.agence.ville}`
      : "",
    active: Boolean(a.is_active),
  }));
}
export async function getAdmin(id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const admins = await listAuthAdmins(token);
  const admin = admins.find((a) => a.id === id);

  if (!admin) {
    throw new ApiError("NOT_FOUND", "Administrateur introuvable.");
  }

  return {
    id: admin.id,
    name: `${admin.prenom} ${admin.nom}`.trim(),
    firstName: admin.prenom,
    lastName: admin.nom,
    email: admin.email,
    phone: admin.telephone || "",
    agencyId: admin.agence_id,
    agency: admin.agence
      ? `${admin.agence.nom_agence} - ${admin.agence.ville}`
      : "",
  };
}

export async function saveAdmin(data, id, token) {
  if (!token) {
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  const payload = {
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
    telephone: data.telephone || null,
    agence_id: data.agence_id,
    ...(data.password ? { password: data.password } : {}),
  };

  if (id) {
    return await updateAdminAccount(token, id, payload);
  }

  return await createAdminAccount(token, {
    ...payload,
    password: data.password,
  });
}
export async function toggleAdmin(id) { await wait(500); const a = db.admins.find((x) => x.id === id); a.active = !a.active; return a.active; }
export const listCities = () => db.agencies.filter((a) => a.active).map((a) => a.city);
export const listAgencyOptions = () => db.agencies.filter((a) => a.active).map((a) => ({ value: a.id, label: `${a.name}` }));
export const getAgencyOfUser = (user) =>
  user?.agency ?? db.agencies.find((a) => a.id === user?.agencyId) ?? null;

/* ───────────────────────────── Notifications ───────────────────────────── */
const NOTIF_TEXT = {
  pending: ["Colis", "Nouveau colis enregistré", (h) => `${h.parcelId} a été enregistré.`],
  arrived: ["Colis", "Colis arrivé à l'agence", (h) => `${h.parcelId} est arrivé et attend une affectation.`],
  assigned: ["Livraison", "Livreur affecté", (h) => `${h.note || "Un livreur"} livrera ${h.parcelId}.`],
  out_for_delivery: ["Livraison", "Livraison démarrée", (h) => `${h.by} a démarré la livraison de ${h.parcelId}.`],
  delivered: ["Livraison", "Colis livré", (h) => `${h.parcelId} a été livré avec succès.`],
  failed: ["Incident", "Échec de livraison", (h) => `${h.parcelId} : ${h.note || "problème signalé"}.`],
};
function seedNotifications(user) {
  if (user.role === "SUPER_ADMIN") {
    return [
      { category: "Système", title: "Agence en attente d'activation", message: "L'agence d'Oujda est créée mais désactivée.", at: new Date(DEMO_NOW - 3 * H).toISOString(), read: false },
      { category: "Incident", title: "Taux d'échec en hausse", message: "L'agence d'Agadir enregistre plusieurs échecs de livraison cette semaine.", at: new Date(DEMO_NOW - 20 * H).toISOString(), read: false },
      { category: "Système", title: "Nouvel administrateur", message: "Hind Mansouri a été ajoutée à l'agence d'Oujda.", at: new Date(DEMO_NOW - 72 * H).toISOString(), read: true },
    ].map((n, i) => ({ id: `n-s${i}`, ...n }));
  }
  const src = db.history.filter((h) => (user.role === "ADMIN" ? (h.destAgencyId === user.agencyId || h.originAgencyId === user.agencyId) : h.courierId === user.id) && NOTIF_TEXT[h.to]);
  const list = (user.role === "LIVREUR" ? src.filter((h) => ["assigned", "failed", "delivered", "out_for_delivery"].includes(h.to)) : src).slice(0, 10);
  return list.map((h, i) => {
    const [category, title, msg] = NOTIF_TEXT[h.to];
    return { id: `n-${user.id}-${i}`, category: user.role === "LIVREUR" && h.to === "assigned" ? "Affectation" : category, title: user.role === "LIVREUR" && h.to === "assigned" ? "Nouvelle affectation" : title, message: user.role === "LIVREUR" && h.to === "assigned" ? `${h.parcelId} vous a été affecté.` : msg(h), at: h.at, read: i > 3, link: user.role === "ADMIN" ? `/admin/colis/${h.parcelId}` : null };
  });
}

export async function getNotifications(user, token) {
  if (user.role === "LIVREUR") {
    if (!token) {
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }

    const notifications = await backendGet(
      `${LIVRAISON_API}/api/livraisons/notifications/livreur`,
      token
    );

    return notifications.map((n) => ({
      ...n,
      id: String(n.id),
      at: n.created_at,
      read: n.is_read ?? n.read,
      link: null,
    }));
  }

  await wait(300);
  if (!db.notifications[user.id]) {
    db.notifications[user.id] = seedNotifications(user);
  }
  return clone(db.notifications[user.id]);
}

export async function markNotification(user, id, read = true, token) {
  if (user.role === "LIVREUR") {
    if (read) {
      return backendPatch(
        `${LIVRAISON_API}/api/livraisons/notifications/livreur/${id}/read`,
        token,
        {}
      );
    }
    return;
  }

  (db.notifications[user.id] || []).forEach((n) => {
    if (n.id === id) n.read = read;
  });
}

export async function markAllNotifications(user, token) {
  if (user.role === "LIVREUR") {
    const notifications = await getNotifications(user, token);

    await Promise.all(
      notifications
        .filter((n) => !n.read)
        .map((n) => markNotification(user, n.id, true, token))
    );
    return;
  }

  (db.notifications[user.id] || []).forEach((n) => {
    n.read = true;
  });
}

export async function removeNotification(user, id) {
  (db.notifications[user.id] || []).forEach((n) => {
    if (n.id === id) n.removed = true;
  });
  db.notifications[user.id] = (db.notifications[user.id] || []).filter(
    (n) => n.id !== id
  );
}

export async function sendNotification(user, { to, message }) {
  await wait(700);
  db.sent.unshift({ id: `s${Date.now()}`, to, message, at: nowIso(), read: false, by: user.id });
}
export async function listSentNotifications(user) {
  await wait(300);
  const base = db.couriers.filter((c) => c.agencyId === user.agencyId).slice(0, 3).map((c, i) => ({ id: `seed-${i}`, to: c.name, message: i === 0 ? "Merci de passer à l'agence avant 9 h demain." : i === 1 ? "Nouvelle tournée disponible, consultez vos livraisons." : "Rappel : pensez à mettre à jour votre disponibilité.", at: new Date(DEMO_NOW - (i + 1) * 26 * H).toISOString(), read: i > 0, by: user.id }));
  return [...db.sent.filter((s) => s.by === user.id), ...base];
}

/* Codes d'exemple proposés sur la page d'accueil publique (démo uniquement). */
export const demoTrackingCodes = () => [
  { code: DEMO.transit, label: "En transit", tone: "info" }, { code: DEMO.arrived, label: "Arrivé à l'agence", tone: "violet" },
  { code: DEMO.delivered, label: "Livré", tone: "success" }, { code: "CT-9999", label: "Introuvable", tone: "neutral" }, { code: "ERREUR", label: "Erreur réseau", tone: "danger" },
];
