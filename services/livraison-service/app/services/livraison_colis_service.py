
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.livraison import Livraison
from app.models.livraison_colis import LivraisonColis
from app.models.colis import Colis
from app.schemas.livraison_colis import LivraisonColisCreate


def add_colis_to_livraison(
    db: Session,
    livraison_id: UUID,
    colis_data: LivraisonColisCreate,
):
    livraison = (
        db.query(Livraison)
        .filter(Livraison.id == livraison_id)
        .first()
    )

    if livraison is None:
        return None, "Livraison introuvable"

    colis = (
        db.query(Colis)
        .filter(Colis.id == colis_data.colis_id)
        .first()
    )

    if colis is None:
        return None, "Colis introuvable"

    existing = (
        db.query(LivraisonColis)
        .filter(
            LivraisonColis.livraison_id == livraison_id,
            LivraisonColis.colis_id == colis_data.colis_id,
        )
        .first()
    )

    if existing:
        return None, "Ce colis est deja associe a cette livraison"

    new_association = LivraisonColis(
        livraison_id=livraison_id,
        **colis_data.model_dump(),
    )

    try:
        db.add(new_association)
        db.commit()
        db.refresh(new_association)
        return new_association, None

    except Exception:
        db.rollback()
        raise


def get_colis_by_livraison(
    db: Session,
    livraison_id: UUID,
):
    livraison = (
        db.query(Livraison)
        .filter(Livraison.id == livraison_id)
        .first()
    )

    if livraison is None:
        return None

    return (
        db.query(LivraisonColis)
        .filter(LivraisonColis.livraison_id == livraison_id)
        .order_by(LivraisonColis.ordre_livraison)
        .all()
    )
