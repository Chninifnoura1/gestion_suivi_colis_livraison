import secrets
from datetime import datetime
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import text
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

# CREATE
def create_colis(
    db: Session,
    colis_data: ColisCreate,
    agence_expedition_id: UUID,
) -> Colis:
    """Create a parcel and resolve its destination agency."""

    # البحث عن الوكالة النشيطة في مدينة المستلم
    agence_destination_id = db.execute(
        text("""
            SELECT id
            FROM agence.agences
            WHERE LOWER(TRIM(ville)) = LOWER(TRIM(:ville))
              AND is_active = TRUE
            LIMIT 1
        """),
        {"ville": colis_data.destinataire_ville},
    ).scalar_one_or_none()

    # رفض إنشاء colis إذا لم توجد وكالة في مدينة المستلم
    if agence_destination_id is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Aucune agence active n'existe dans la ville "
                f"{colis_data.destinataire_ville}."
            ),
        )

    colis_fields = colis_data.model_dump(
        exclude={"agence_expedition_id"}
    )

    new_colis = Colis(
        **colis_fields,
        agence_expedition_id=agence_expedition_id,
        agence_destination_id=agence_destination_id,
        agence_actuelle_id=agence_expedition_id,
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
def get_all_colis(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    agence_id: UUID | None = None,
):
    query = db.query(Colis)

    if agence_id is not None:
        query = query.filter(
            Colis.agence_actuelle_id == agence_id
        )

    return (
        query
        .order_by(Colis.date_enregistrement.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# UPDATE

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

    # إذا تبدلات مدينة المستلم، نبحث عن وكالة الوجهة الجديدة
    if "destinataire_ville" in update_data:
        agence_destination_id = db.execute(
            text("""
                SELECT id
                FROM agence.agences
                WHERE LOWER(TRIM(ville)) = LOWER(TRIM(:ville))
                  AND is_active = TRUE
                LIMIT 1
            """),
            {"ville": update_data["destinataire_ville"]},
        ).scalar_one_or_none()

        if agence_destination_id is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Aucune agence active n'existe dans la ville "
                    f"{update_data['destinataire_ville']}."
                ),
            )

        colis.agence_destination_id = agence_destination_id

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
