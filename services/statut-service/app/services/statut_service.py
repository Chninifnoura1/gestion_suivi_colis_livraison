import os
import logging

import httpx
from sqlalchemy.orm import Session


from app.models.statut import HistoriqueStatut, Statut
from app.schemas.statut import StatutCreate
logger = logging.getLogger(__name__)

# Check that the parcel exists by asking the Colis Service.
# Returns True (exists), False (not found) or None (service unreachable or in error).
# If COLIS_SERVICE_URL is not set, the check is skipped.

def colis_exists(colis_id) -> bool | None:
    base_url = os.getenv("COLIS_SERVICE_URL")
    api_key = os.getenv("INTERNAL_API_KEY")

    if not base_url or not api_key:
        logger.error(
            "COLIS_SERVICE_URL or INTERNAL_API_KEY is not configured"
        )
        return None

    try:
        response = httpx.get(
            f"{base_url}/api/colis/internal/{colis_id}/exists",
            headers={"X-Internal-API-Key": api_key},
            timeout=3,
        )
    except httpx.HTTPError:
        logger.exception(
            "Failed to check parcel existence for %s",
            colis_id,
        )
        return None

    if response.status_code == 200:
        return bool(response.json().get("exists", False))

    if response.status_code == 404:
        return False

    return None



# Tell the Notification Service that the status changed.
# Best effort: a failure never blocks the status change.
# (URL and format to agree on with the Notification Service owner)
def notify_status_change(entry: HistoriqueStatut) -> None:
    if entry.code not in ("ECHEC", "LIVRE"):
        return

    base_url = os.getenv("NOTIFICATION_SERVICE_URL")
    api_key = os.getenv("INTERNAL_API_KEY")

    if not base_url or not api_key:
        logger.error("Notification service URL or API key is missing")
        return

    try:
        response = httpx.post(
            f"{base_url}/notifications/statut",
            headers={"X-Internal-Key": api_key},
json={
    "colisId": str(entry.colis_id),
    "statutCode": entry.code,
    "localisation": entry.localisation,
    "motif": entry.motif_echec,
},
            timeout=3,
        )
        response.raise_for_status()

    except httpx.HTTPError:
        logger.exception(
            "Failed to notify Notification Service for parcel %s",
            entry.colis_id,
        )
# CREATE: Record a new status change for a parcel
def create_statut(db: Session, data: StatutCreate) -> HistoriqueStatut:
    reference = db.query(Statut).filter(Statut.code == data.code).first()

    if reference is None:
        raise ValueError(f"Statut inconnu : {data.code}")

    entry = HistoriqueStatut(
        statut=reference,
        **data.model_dump(exclude={"code"}),
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Notify only when the parcel is actually delivered.
# Notify the customer only when delivery fails or succeeds.
    if entry.code in ("ECHEC", "LIVRE"):
        notify_status_change(entry)

    return entry


# READ: Latest status of a parcel (the displayed status)
def get_current_statut(db: Session, colis_id) -> HistoriqueStatut | None:
    return (
        db.query(HistoriqueStatut)
        .filter(HistoriqueStatut.colis_id == colis_id)
        .order_by(
            HistoriqueStatut.date_changement.desc(),
            HistoriqueStatut.id.desc()
        )
        .first()
    )


# READ: Full history of a parcel, oldest first
def get_history(db: Session, colis_id) -> list[HistoriqueStatut]:
    return (
        db.query(HistoriqueStatut)
        .filter(HistoriqueStatut.colis_id == colis_id)
        .order_by(
            HistoriqueStatut.date_changement.asc(),
            HistoriqueStatut.id.asc()
        )
        .all()
    )
