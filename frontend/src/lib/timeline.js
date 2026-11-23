
import { STATUS } from "./constants";

/* Construit la timeline uniquement avec les événements réels. */
export function buildTimeline(events = [], status) {
  const steps = events.map((e, i) => ({
    key: `${e.status}-${e.at || i}`,
    status: STATUS[e.status] ? e.status : "pending",
    label: STATUS[e.status]?.event || e.status || "Statut inconnu",
    at: e.at,
    city: e.city,
    by: e.by,
    note: e.note,
    state: "done",
  }));

  if (steps.length > 0) {
    if (status === "failed" || status === "cancelled") {
      steps[steps.length - 1].state = "terminal";
      return steps;
    }

    if (status === "delivered") {
      steps[steps.length - 1].state = "final";
      return steps;
    }

    steps[steps.length - 1].state = "current";
  }

  return steps;
}

const PROGRESS = {
  pending: 0.04,
  shipped: 0.16,
  in_transit: 0.4,
  arrived: 0.62,
  assigned: 0.74,
  out_for_delivery: 0.88,
  delivered: 1,
  failed: 0.88,
  cancelled: 0,
};

export const routeProgress = (status) => PROGRESS[status] ?? 0;
