
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    get_current_livreur,
    get_current_livraison_user,
)
from app.services import livraison_service
from app.schemas.livraison_colis import (
    LivraisonColisCreate,
    LivraisonColisResponse,
)
from app.services import livraison_colis_service


router = APIRouter(
    prefix="/api/livraisons",
    tags=["Livraison Colis"],
)


@router.post(
    "/{livraison_id}/colis",
    response_model=LivraisonColisResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_colis_to_livraison(
    livraison_id: UUID,
    colis_data: LivraisonColisCreate,
    current_user=Depends(get_current_livreur),
    db: Session = Depends(get_db),
):
    livraison = livraison_service.get_livraison_by_id(db, livraison_id)

    if livraison is None or livraison.livreur_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livraison introuvable",
        )

    association, error = livraison_colis_service.add_colis_to_livraison(
        db,
        livraison_id,
        colis_data,
    )

    if error:
        if error in ("Livraison introuvable", "Colis introuvable"):
            status_code = status.HTTP_404_NOT_FOUND
        else:
            status_code = status.HTTP_409_CONFLICT

        raise HTTPException(
            status_code=status_code,
            detail=error,
        )

    return association


@router.get(
    "/{livraison_id}/colis",
    response_model=list[LivraisonColisResponse],
)
def get_colis_by_livraison(
    livraison_id: UUID,
    current_user=Depends(get_current_livraison_user),
    db: Session = Depends(get_db),
):
    livraison = livraison_service.get_livraison_by_id(db, livraison_id)

    if livraison is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livraison introuvable",
        )

    if current_user["role"] == "LIVREUR":
        if livraison.livreur_id != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livraison introuvable",
            )

    elif current_user["role"] == "ADMIN":
        if (
            not current_user["agence_id"]
            or livraison.agence_arrivee_id != current_user["agence_id"]
            or livraison.type_mission != "TRANSPORT_INTER_AGENCES"
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livraison introuvable",
            )

    colis = livraison_colis_service.get_colis_by_livraison(
        db,
        livraison_id,
    )

    if colis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livraison introuvable",
        )

    return colis
