import os

import httpx
from sqlalchemy.orm import Session

from app.models.statut import HistoriqueStatut, Statut
from app.schemas.statut import StatutCreate


# Check that the parcel exists by asking the Colis Service.
# Returns True (exists), False (not found) or None (service unreachable or in error).
# If COLIS_SERVICE_URL is not set, the check is skipped.
def colis_exists(colis_id) -> bool | None:
    base_url = os.getenv("COLIS_SERVICE_URL")
    if not base_url:
        return True

    try:
        response = httpx.get(f"{base_url}/api/v1/colis/{colis_id}", timeout=3)
    except httpx.HTTPError:
        return None

    if response.status_code == 200:
        return True
    if response.status_code == 404:
        return False
    return None


# Tell the Notification Service that the status changed.
# Best effort: a failure never blocks the status change.
# (URL and format to agree on with the Notification Service owner)
def notify_status_change(entry: HistoriqueStatut) -> None:
    base_url = os.getenv("NOTIFICATION_SERVICE_URL")
    if not base_url:
        return

    try:
        httpx.post(
            f"{base_url}/api/v1/notifications/",
            json={
                "colis_id": str(entry.colis_id),
                "type": entry.code,
                "message": f"Votre colis est : {entry.libelle}",
            },
            timeout=3,
        )
    except httpx.HTTPError:
        pass


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

    notify_status_change(entry)

    return entry


# READ: Latest status of a parcel (the displayed status)
def get_current_statut(db: Session, colis_id) -> HistoriqueStatut | None:
    return db.query(HistoriqueStatut).filter(
        HistoriqueStatut.colis_id == colis_id
    ).order_by(HistoriqueStatut.date_changement.desc()).first()


# READ: Full history of a parcel, oldest first
def get_history(db: Session, colis_id) -> list[HistoriqueStatut]:
    return db.query(HistoriqueStatut).filter(
        HistoriqueStatut.colis_id == colis_id
    ).order_by(HistoriqueStatut.date_changement.asc()).all()
