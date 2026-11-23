
import os
import logging
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models.livraison import Livraison
from app.schemas.livraison import LivraisonCreate, LivraisonUpdate


logger = logging.getLogger(__name__)




def create_livraison(
    db: Session,
    livraison_data: LivraisonCreate,
) -> Livraison:
    new_livraison = Livraison(**livraison_data.model_dump())

    try:
        db.add(new_livraison)
        db.commit()
        db.refresh(new_livraison)
        return new_livraison

    except Exception:
        db.rollback()
        raise


def get_livraison_by_id(
    db: Session,
    livraison_id: UUID,
):
    return (
        db.query(Livraison)
        .filter(Livraison.id == livraison_id)
        .first()
    )


def get_all_livraisons(
    db: Session,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(Livraison)
        .order_by(Livraison.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_livraisons_by_livreur(
    db: Session,
    livreur_id: UUID,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(Livraison)
        .filter(Livraison.livreur_id == livreur_id)
        .order_by(Livraison.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_livraison(
    db: Session,
    livraison_id: UUID,
    livraison_data: LivraisonUpdate,
):
    livraison = get_livraison_by_id(db, livraison_id)

    if livraison is None:
        return None

    previous_status = livraison.etat_livraison
    update_data = livraison_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    try:
        for field, value in update_data.items():
            setattr(livraison, field, value)

        db.commit()
        db.refresh(livraison)

    except Exception:
        db.rollback()
        raise

    return livraison

def get_livraisons_by_agence(
    db: Session,
    agence_id: UUID,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(Livraison)
        .filter(Livraison.agence_depart_id == agence_id)
        .order_by(Livraison.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
