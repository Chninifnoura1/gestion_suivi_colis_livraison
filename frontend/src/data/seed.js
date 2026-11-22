/* ───────────────────────────── Données de démonstration ─────────────────────────────
   Jeu de données déterministe (aucun Math.random) servant uniquement de remplacement
   temporaire à l'API FastAPI. Rien dans les composants UI ne dépend de ce fichier :
   tout passe par src/services/api.js. */

export const DEMO_NOW = new Date("2026-11-14T10:30:00");
const H = 3600e3;

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261114);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weighted = (pairs) => { let r = rand() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0]; };
const phone = () => `06 ${String(Math.floor(rand() * 90) + 10)} ${String(Math.floor(rand() * 90) + 10)} ${String(Math.floor(rand() * 90) + 10)} ${String(Math.floor(rand() * 90) + 10)}`;

/* ───── Agences ───── */
export const AGENCIES = [
  { id: "ag-aga", code: "AGA", name: "Agence Agadir", city: "Agadir", address: "Avenue Hassan II, Founty", phone: "05 28 84 12 30", email: "agadir@colistrack.ma", active: true, openedAt: "2021-03-15" },
  { id: "ag-cas", code: "CAS", name: "Agence Casablanca", city: "Casablanca", address: "Boulevard d'Anfa, Maarif", phone: "05 22 47 90 11", email: "casablanca@colistrack.ma", active: true, openedAt: "2020-01-20" },
  { id: "ag-rab", code: "RAB", name: "Agence Rabat", city: "Rabat", address: "Avenue Mohammed V, Agdal", phone: "05 37 70 33 08", email: "rabat@colistrack.ma", active: true, openedAt: "2020-06-02" },
  { id: "ag-mar", code: "MAR", name: "Agence Marrakech", city: "Marrakech", address: "Avenue Mohammed VI, Guéliz", phone: "05 24 43 55 27", email: "marrakech@colistrack.ma", active: true, openedAt: "2021-09-10" },
  { id: "ag-fes", code: "FES", name: "Agence Fès", city: "Fès", address: "Rue Allal Ben Abdellah, Ville Nouvelle", phone: "05 35 62 18 40", email: "fes@colistrack.ma", active: true, openedAt: "2022-02-14" },
  { id: "ag-tan", code: "TAN", name: "Agence Tanger", city: "Tanger", address: "Boulevard Pasteur, Centre", phone: "05 39 94 27 63", email: "tanger@colistrack.ma", active: true, openedAt: "2022-05-30" },
  { id: "ag-ouj", code: "OUJ", name: "Agence Oujda", city: "Oujda", address: "Boulevard Mohammed V", phone: "05 36 70 91 24", email: "oujda@colistrack.ma", active: false, openedAt: "2026-09-01" },
];
export const CITIES = AGENCIES.map((a) => a.city);
export const agencyByCity = (c) => AGENCIES.find((a) => a.city === c);

export const SUPER_USER = { id: "sup-01", name: "Yasmine El Idrissi", email: "super@colistrack.ma", phone: "06 61 00 11 22", role: "SUPER_ADMIN", agencyId: null };

export const ADMINS = [
  { id: "adm-aga", name: "Nadia Bennani", email: "admin@colistrack.ma", phone: "06 62 11 00 01", agencyId: "ag-aga", active: true, createdAt: "2021-03-16" },
  { id: "adm-cas", name: "Youssef Chraibi", email: "y.chraibi@colistrack.ma", phone: "06 62 11 00 02", agencyId: "ag-cas", active: true, createdAt: "2020-01-21" },
  { id: "adm-rab", name: "Salma El Fassi", email: "s.elfassi@colistrack.ma", phone: "06 62 11 00 03", agencyId: "ag-rab", active: true, createdAt: "2020-06-03" },
  { id: "adm-mar", name: "Omar Zerhouni", email: "o.zerhouni@colistrack.ma", phone: "06 62 11 00 04", agencyId: "ag-mar", active: true, createdAt: "2021-09-11" },
  { id: "adm-fes", name: "Laila Sebti", email: "l.sebti@colistrack.ma", phone: "06 62 11 00 05", agencyId: "ag-fes", active: true, createdAt: "2022-02-15" },
  { id: "adm-tan", name: "Reda Benjelloun", email: "r.benjelloun@colistrack.ma", phone: "06 62 11 00 06", agencyId: "ag-tan", active: true, createdAt: "2022-06-01" },
  { id: "adm-ouj", name: "Hind Mansouri", email: "h.mansouri@colistrack.ma", phone: "06 62 11 00 07", agencyId: "ag-ouj", active: false, createdAt: "2026-09-02" },
];

const C = (id, first, last, agencyId, available = true, active = true) => ({
  id, matricule: `LIV-${id.slice(-2).padStart(3, "0")}`, firstName: first, lastName: last, name: `${first} ${last}`,
  email: `${first}.${last}`.toLowerCase().replace(/\s/g, "") + "@colistrack.ma", phone: phone(), address: "", agencyId, available, active,
  since: "2024-0" + (1 + (Number(id.slice(-2)) % 9)) + "-12",
});
export const COURIERS = [
  C("liv-01", "Hamza", "Ouali", "ag-aga"), C("liv-02", "Imane", "Rachidi", "ag-aga"), C("liv-03", "Mehdi", "Karimi", "ag-aga", false),
  C("liv-04", "Anas", "Mansouri", "ag-aga"), C("liv-05", "Ghita", "Sebti", "ag-aga"),
  C("liv-06", "Walid", "Tahiri", "ag-cas"), C("liv-07", "Aya", "Bouzid", "ag-cas"),
  C("liv-08", "Tarik", "Hajji", "ag-rab"), C("liv-09", "Loubna", "Kabbaj", "ag-rab", false),
  C("liv-10", "Soufiane", "Daoudi", "ag-mar"), C("liv-11", "Meryem", "Ziani", "ag-mar"),
  C("liv-12", "Amine", "Hilali", "ag-fes"), C("liv-13", "Zineb", "Ouazzani", "ag-tan"),
];
COURIERS.forEach((c) => { c.address = `${AGENCIES.find((a) => a.id === c.agencyId).city}`; });
COURIERS[0].phone = "06 00 11 22 33"; COURIERS[0].email = "livreur@colistrack.ma";

/* ───── Contacts (expéditeurs / destinataires — sans compte) ───── */
const STREETS = ["Rue Hassan II", "Boulevard Anfa", "Avenue des FAR", "Rue Founty", "Avenue Mohammed V", "Rue Al Massira", "Boulevard Zerktouni", "Rue des Orangers", "Avenue Palestine", "Rue Ibn Sina"];
const FIRST = ["Amine", "Zineb", "Hicham", "Meryem", "Anas", "Khadija", "Soufiane", "Ghita", "Walid", "Aya", "Tarik", "Loubna", "Rachid", "Fatima", "Mounir", "Hajar", "Bilal", "Nour", "Samir", "Yasmine", "Othmane", "Kenza"];
const LAST = ["Bennani", "Chraibi", "Sebti", "Mansouri", "Benjelloun", "Zerhouni", "Hajji", "Kabbaj", "Daoudi", "Ziani", "Hilali", "Ouazzani", "Tahiri", "Bouzid", "Alaoui", "Skalli", "Berrada", "Squalli"];
const fixed = [["Karim Alami", "Casablanca"], ["Sara Benali", "Agadir"], ["Nadia Idrissi", "Rabat"], ["Omar Tazi", "Marrakech"], ["Youssef Amrani", "Fès"], ["Laila Cherkaoui", "Agadir"], ["Hind Berrada", "Tanger"], ["Reda Lahlou", "Agadir"], ["Salma Naciri", "Agadir"], ["Adil Fassi", "Casablanca"]];
const cityMix = [["Agadir", 6], ["Casablanca", 5], ["Rabat", 3], ["Marrakech", 3], ["Fès", 2], ["Tanger", 2]];
const PEOPLE = [...fixed.map(([name, city]) => ({ name, city })),
  ...Array.from({ length: 26 }, (_, i) => ({ name: `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + 3) % LAST.length]}`, city: weighted(cityMix) }))]
  .map((p, i) => ({ ...p, id: `ct-${String(i + 1).padStart(3, "0")}`, phone: phone(), email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.ma`, address: `${10 + Math.floor(rand() * 90)} ${pick(STREETS)}` }));
PEOPLE.forEach((p) => { if (p.name === "Sara Benali") { p.phone = "06 98 76 54 32"; p.address = "12 Rue Hassan II"; } if (p.name === "Laila Cherkaoui") { p.phone = "06 55 44 33 22"; p.address = "8 Boulevard Anfa"; } });
export const CONTACTS = PEOPLE;
const person = (name) => PEOPLE.find((p) => p.name === name);
const inCity = (city) => pick(PEOPLE.filter((p) => p.city === city));

/* ───── Colis ───── */
const CONTENTS = ["Vêtements", "Livres", "Électronique", "Pièces détachées", "Documents", "Cosmétiques", "Artisanat", "Produits alimentaires", "Outils", "Chaussures"];
const TYPES = ["Carton", "Carton", "Carton", "Enveloppe", "Sac", "Fragile", "Palette"];
export const CUM = [0, 4, 12, 30, 34, 37, 41]; // heures cumulées entre chaque étape du parcours

const HAND = [
  { demo: "arrived",   s: "Karim Alami", r: "Sara Benali", at: "2026-11-11T10:00", status: "arrived", content: "Vêtements", weight: 4.2, dims: [40, 30, 20], priority: "express" },
  { demo: "transit",   s: "Nadia Idrissi", r: "Omar Tazi", at: "2026-11-12T14:00", status: "in_transit" },
  { demo: "out",       s: "Youssef Amrani", r: "Laila Cherkaoui", at: "2026-11-10T09:00", status: "out_for_delivery", courier: "liv-01", priority: "express" },
  { demo: "delivered", s: "Hind Berrada", r: "Reda Lahlou", at: "2026-11-07T08:30", status: "delivered", courier: "liv-02" },
  { demo: "pending",   s: "Salma Naciri", r: "Adil Fassi", at: "2026-11-14T08:10", status: "pending" },
  { demo: "assigned",  from: "Casablanca", to: "Agadir", at: "2026-11-11T08:00", status: "assigned", courier: "liv-01" },
  { demo: "failed",    from: "Marrakech", to: "Agadir", at: "2026-11-09T10:00", status: "failed", courier: "liv-03", failure: "Destinataire absent" },
  { demo: "shipped",   from: "Agadir", to: "Rabat", at: "2026-11-13T16:00", status: "shipped" },
  { demo: "arrived2",  from: "Marrakech", to: "Agadir", at: "2026-11-12T07:00", status: "arrived" },
  { demo: "out2",      from: "Rabat", to: "Agadir", at: "2026-11-12T06:00", status: "out_for_delivery", courier: "liv-01" },
  { demo: "done2",     from: "Casablanca", to: "Agadir", at: "2026-11-12T16:00", status: "delivered", courier: "liv-01" },
  { demo: "cancelled", from: "Agadir", to: "Tanger", at: "2026-11-13T11:00", status: "cancelled" },
  { demo: "today1",    from: "Agadir", to: "Marrakech", at: "2026-11-14T09:05", status: "pending" },
  { demo: "today2",    from: "Casablanca", to: "Agadir", at: "2026-11-14T07:40", status: "shipped" },
  { demo: "transit2",  from: "Casablanca", to: "Agadir", at: "2026-11-13T09:00", status: "in_transit" },
  { demo: "transit3",  from: "Rabat", to: "Agadir", at: "2026-11-13T15:00", status: "in_transit" },
];

function makeGenerated(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const age = Math.floor(Math.pow(rand(), 1.5) * 98) + (rand() > 0.9 ? 0 : 1);
    const at = new Date(DEMO_NOW.getTime() - age * 24 * H - Math.floor(rand() * 10) * H);
    const maxK = CUM.reduce((m, c, k) => (c * H <= DEMO_NOW - at - H ? k : m), 0);
    let status;
    const r = rand();
    if (maxK === 6 && age > 6) status = r < 0.86 ? "delivered" : r < 0.94 ? "failed" : r < 0.97 ? "cancelled" : "delivered";
    else status = (r < 0.04 && maxK <= 1) ? "cancelled" : FLOW_BY_K[Math.max(0, maxK - Math.floor(rand() * 3))];
    const fromCity = weighted(cityMix), toCity = weighted(cityMix.filter(([c]) => c !== fromCity));
    out.push({ s: inCity(fromCity).name, r: inCity(toCity).name, at, status });
  }
  return out;
}
const FLOW_BY_K = ["pending", "shipped", "in_transit", "arrived", "assigned", "out_for_delivery", "delivered"];

function buildEvents(p) {
  const originAdmin = ADMINS.find((a) => a.agencyId === p.originAgencyId)?.name || "Agence";
  const destAdmin = ADMINS.find((a) => a.agencyId === p.destAgencyId)?.name || "Agence";
  const courier = COURIERS.find((c) => c.id === p.courierId)?.name;
  const at = (k) => new Date(new Date(p.createdAt).getTime() + CUM[k] * H);
  const ev = (status, k, city, by, extra = 0, note = "") => ({ status, at: new Date(at(k).getTime() + extra * H).toISOString(), city, by, note });
  if (p.status === "cancelled") return [ev("pending", 0, p.fromCity, originAdmin), ev("cancelled", 0, p.fromCity, originAdmin, 2, "Annulé à la demande de l'expéditeur")];
  const last = p.status === "failed" ? 5 : FLOW_BY_K.indexOf(p.status);
  const list = [];
  for (let k = 0; k <= last; k++) {
    const s = FLOW_BY_K[k];
    const city = k <= 1 ? p.fromCity : k === 2 ? "En route" : p.toCity;
    const by = k <= 1 ? originAdmin : k === 2 ? "Système" : k <= 4 ? destAdmin : courier;
    list.push(ev(s, k, city, by));
  }
  if (p.status === "failed") list.push(ev("failed", 5, p.toCity, courier, 4, p.failure || "Destinataire absent"));
  return list;
}

const all = [...HAND.map((h) => ({ ...h, hand: true })), ...makeGenerated(96)].sort((a, b) => new Date(a.at) - new Date(b.at));

export const PARCELS = all.map((h, i) => {
  const s = person(h.s) || (h.from ? inCity(h.from) : null), r = person(h.r) || (h.to ? inCity(h.to) : null);
  const fromCity = s.city, toCity = r.city;
  const created = new Date(h.at);
  const weight = h.weight || Math.round((rand() * 18 + 0.5) * 10) / 10;
  const dims = h.dims || [20 + Math.floor(rand() * 40), 15 + Math.floor(rand() * 30), 10 + Math.floor(rand() * 25)];
  const p = {
    id: `CT-${String(i + 1).padStart(4, "0")}`, demo: h.demo,
    sender: { id: s.id, name: s.name, phone: s.phone, email: s.email, address: s.address, city: fromCity },
    recipient: { id: r.id, name: r.name, phone: r.phone, email: r.email, address: r.address, city: toCity, postal: "" },
    content: h.content || pick(CONTENTS), type: pick(TYPES), weight, dims, notes: "", priority: h.priority || (rand() > 0.82 ? "express" : "standard"),
    fromCity, toCity, originAgencyId: agencyByCity(fromCity).id, destAgencyId: agencyByCity(toCity).id,
    createdAt: created.toISOString(), shipDate: new Date(created.getTime() + 4 * H).toISOString(),
    eta: new Date(new Date(created).setHours(17, 0, 0, 0) + (fromCity === toCity ? 1 : 3) * 24 * H).toISOString(),
    fee: Math.round((25 + weight * 3 + (h.priority === "express" ? 20 : 0)) / 5) * 5,
    status: h.status, failure: h.failure,
  };
  if (["assigned", "out_for_delivery", "delivered", "failed"].includes(p.status)) {
    p.courierId = h.courier || pick(COURIERS.filter((c) => c.agencyId === p.destAgencyId)).id;
  }
  p.events = buildEvents(p);
  return p;
});
PARCELS.sort((a, b) => a.id.localeCompare(b.id));

export const DEMO = Object.fromEntries(PARCELS.filter((p) => p.demo).map((p) => [p.demo, p.id]));

/* ───── Livraisons & historique ───── */
export const DELIVERIES = PARCELS.filter((p) => p.courierId).map((p) => {
  const ev = (s) => p.events.find((e) => e.status === s);
  return {
    parcelId: p.id, courierId: p.courierId, agencyId: p.destAgencyId, status: p.status,
    assignedAt: ev("assigned").at, startedAt: ev("out_for_delivery")?.at || null,
    completedAt: (ev("delivered") || ev("failed"))?.at || null,
    failure: p.status === "failed" ? { reason: p.failure || "Destinataire absent", comment: "Plusieurs appels sans réponse. Avis de passage laissé.", at: ev("failed").at } : null,
    receiver: p.status === "delivered" ? { name: p.recipient.name, relation: "Destinataire" } : null,
    remarks: [],
  };
}).sort((a, b) => new Date(a.assignedAt) - new Date(b.assignedAt)).map((d, i) => ({ ...d, id: `LV-${String(i + 1).padStart(3, "0")}` }));

export const HISTORY = PARCELS.flatMap((p) => p.events.map((e, i) => ({
  id: `${p.id}-${i}`, parcelId: p.id, from: i ? p.events[i - 1].status : null, to: e.status, at: e.at, by: e.by, note: e.note || "",
  originAgencyId: p.originAgencyId, destAgencyId: p.destAgencyId, courierId: p.courierId || null,
}))).sort((a, b) => new Date(b.at) - new Date(a.at));
