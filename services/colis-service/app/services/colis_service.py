import secrets
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.colis import Colis
from app.schemas.colis import ColisCreate, ColisUpdate


def generate_tracking_number(db: Session) -> str:
    """Generate a unique parcel tracking number."""

    while True:
        year = datetime.now().year
        random_code = secrets.token_hex(4).upper()
        tracking_number = f"SC-{year}-{random_code}"

        existing = (
            db.query(Colis)
            .filter(Colis.numero_suivi == tracking_number)
            .first()
        )

        if existing is None:
            return tracking_number


# CREATE
def create_colis(db: Session, colis_data: ColisCreate) -> Colis:
    """Create a new parcel."""

    new_colis = Colis(
        **colis_data.model_dump(),
        numero_suivi=generate_tracking_number(db),
    )

    db.add(new_colis)
    db.commit()
    db.refresh(new_colis)

    return new_colis


# READ BY ID
def get_colis_by_id(db: Session, colis_id: UUID):
    return db.query(Colis).filter(Colis.id == colis_id).first()


# READ BY TRACKING NUMBER
def get_colis_by_tracking(db: Session, numero_suivi: str):
    return (
        db.query(Colis)
        .filter(Colis.numero_suivi == numero_suivi)
        .first()
    )


# READ ALL
def get_all_colis(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Colis)
        .order_by(Colis.date_enregistrement.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# UPDATE
def update_colis(
    db: Session,
    colis_id: UUID,
    colis_data: ColisUpdate,
):
    colis = get_colis_by_id(db, colis_id)

    if colis is None:
        return None

    update_data = colis_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    for field, value in update_data.items():
        setattr(colis, field, value)

    db.commit()
    db.refresh(colis)

    return colis


# DELETE
def delete_colis(db: Session, colis_id: UUID) -> bool:
    colis = get_colis_by_id(db, colis_id)

    if colis is None:
        return False

    db.delete(colis)
    db.commit()

    return True
