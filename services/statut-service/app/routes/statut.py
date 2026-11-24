
import secrets
from uuid import UUID
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from sqlalchemy import text

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.statut import Statut, HistoriqueStatut
from app.schemas.statut import StatutCreate, StatutResponse
from app.services import statut_service



router = APIRouter()


class PriseEnChargeInternal(BaseModel):
    colis_ids: list[UUID] = Field(min_length=1)
    utilisateur_id: UUID
    localisation: str | None = None
    commentaire: str | None = None


ADMIN_DEPART_STATUSES = {
    "CREE",
    "EN_ATTENTE",
    "PRIS_EN_CHARGE",
    "EN_COURS",
}

ADMIN_ARRIVAL_STATUSES = {
    "PRIS_EN_CHARGE",
    "EN_COURS",
    "NOUVELLE_TENTATIVE",
}

LIVREUR_STATUSES = {
    "ARRIVEE_A_L_AGENCE",
    "LIVRE",
    "ECHEC",
}



@router.post(
    "/",
    response_model=StatutResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_statut(
    statut_data: StatutCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = current_user["role"]
    code = statut_data.code

    # Vérifier que le colis existe dans le service Colis.
    exists = statut_service.colis_exists(statut_data.colis_id)

    if exists is False:
        raise HTTPException(status_code=404, detail="Colis introuvable.")

    if exists is None:
        raise HTTPException(
            status_code=503,
            detail="Le service Colis est indisponible.",
        )

    # Récupérer l'agence actuelle, l'agence destination
    # et vérifier si le colis est déjà arrivé à destination.
    colis = db.execute(
        text("""
            SELECT
                c.agence_actuelle_id,
                c.agence_destination_id,
                (
                    SELECT s.code = 'ARRIVEE_A_L_AGENCE'
                    FROM statut.historique_statuts hs
                    JOIN statut.statuts s ON s.id = hs.statut_id
                    WHERE hs.colis_id = c.id
                    ORDER BY hs.date_changement DESC, hs.id DESC
                    LIMIT 1
                ) AS deja_arrive
            FROM colis.colis c
            WHERE c.id = :colis_id
        """),
        {"colis_id": statut_data.colis_id},
    ).mappings().first()

    if colis is None:
        raise HTTPException(status_code=404, detail="Colis introuvable.")

    # ADMIN : vérifier l'agence et la phase du colis.
    if role == "ADMIN":
        agence_id = current_user["agence_id"]

        if agence_id is None:
            raise HTTPException(
                status_code=403,
                detail="Aucune agence associée à cet administrateur.",
            )

        if colis["agence_actuelle_id"] != agence_id:
            raise HTTPException(
                status_code=403,
                detail="Ce colis ne se trouve pas dans votre agence.",
            )

        est_phase_arrivee = (
            colis["deja_arrive"]
            and colis["agence_actuelle_id"] == colis["agence_destination_id"]
        )

        if est_phase_arrivee:
            allowed_statuses = ADMIN_ARRIVAL_STATUSES
        else:
            allowed_statuses = ADMIN_DEPART_STATUSES

        if code not in allowed_statuses:
            raise HTTPException(
                status_code=403,
                detail="Ce statut n'est pas autorisé pour votre agence à cette étape.",
            )

    # SUPER_ADMIN : ne modifie pas les statuts opérationnels.
    elif role == "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Le Super Admin ne peut pas modifier les statuts opérationnels.",
        )

    # LIVREUR : vérifier la mission qui lui est attribuée.
    elif role == "LIVREUR":

        if code == "ARRIVEE_A_L_AGENCE":
            mission_type = "TRANSPORT_INTER_AGENCES"

        elif code in ("LIVRE", "ECHEC"):
            mission_type = "LIVRAISON_CLIENT"

        else:
            raise HTTPException(
                status_code=403,
                detail="Le livreur ne peut appliquer que les statuts autorisés pour sa mission.",
            )

        mission = db.execute(
            text("""
                SELECT l.id
                FROM livraison.livraisons l
                JOIN livraison.livraison_colis lc
                    ON lc.livraison_id = l.id
                WHERE lc.colis_id = :colis_id
                  AND l.livreur_id = :livreur_id
                  AND l.type_mission = :mission_type
                  AND l.etat_livraison::text = 'EN_TRANSIT'

                  AND (
                    (
                        :mission_type = 'TRANSPORT_INTER_AGENCES'
                        AND l.agence_depart_id = :agence_actuelle_id
                        AND l.agence_arrivee_id = :agence_destination_id
                    )
                    OR
                    (
                        :mission_type = 'LIVRAISON_CLIENT'
                        AND :deja_arrive IS TRUE
                        AND :agence_actuelle_id = :agence_destination_id
                        AND l.agence_depart_id = :agence_destination_id
                        AND l.agence_arrivee_id = :agence_destination_id
                    )
                  )
                LIMIT 1
            """),
            {
                "colis_id": statut_data.colis_id,
                "livreur_id": current_user["id"],
                "mission_type": mission_type,
                "agence_actuelle_id": colis["agence_actuelle_id"],
                "agence_destination_id": colis["agence_destination_id"],
                "deja_arrive": colis["deja_arrive"],
            },
        ).first()

        if mission is None:
            raise HTTPException(
                status_code=403,
                detail="Aucune mission active correspondante ne vous est attribuée pour ce colis.",
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé.",
        )

    # Ne jamais accepter utilisateur_id envoyé par le frontend.
    statut_data = statut_data.model_copy(
        update={"utilisateur_id": current_user["id"]}
    )

    try:
        return statut_service.create_statut(db, statut_data)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

@router.post("/internal/prise-en-charge")
def prise_en_charge_internal(
    data: PriseEnChargeInternal,
    x_internal_api_key: str | None = Header(
        default=None,
        alias="X-Internal-API-Key",
    ),
    db: Session = Depends(get_db),
):
    if (
        not x_internal_api_key
        or not secrets.compare_digest(
            x_internal_api_key,
            settings.INTERNAL_API_KEY,
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="Acces interne refuse",
        )

    try:
        statut_ref = (
            db.query(Statut)
            .filter(Statut.code == "PRIS_EN_CHARGE")
            .first()
        )

        if not statut_ref:
            raise HTTPException(
                status_code=500,
                detail="Statut PRIS_EN_CHARGE introuvable",
            )

        enregistres = []
        deja_enregistres = []

        for colis_id in dict.fromkeys(data.colis_ids):

            existe = statut_service.colis_exists(colis_id)

            if existe is None:
                raise HTTPException(
                    status_code=503,
                    detail=f"Verification du colis impossible: {colis_id}",
                )

            if not existe:
                raise HTTPException(
                    status_code=404,
                    detail=f"Colis introuvable: {colis_id}",
                )

            derniere_entree = (
                db.query(HistoriqueStatut)
                .filter(HistoriqueStatut.colis_id == colis_id)
                .order_by(
                    HistoriqueStatut.date_changement.desc(),
                    HistoriqueStatut.id.desc(),
                )
                .first()
            )

            if derniere_entree and derniere_entree.code == "PRIS_EN_CHARGE":
                deja_enregistres.append(str(colis_id))
                continue

            entree = HistoriqueStatut(
                colis_id=colis_id,
                statut_id=statut_ref.id,
                utilisateur_id=data.utilisateur_id,
                localisation=data.localisation,
                commentaire=data.commentaire,
            )

            db.add(entree)
            enregistres.append(str(colis_id))

        db.commit()

        return {
            "message": "Prise en charge enregistree",
            "statut": "PRIS_EN_CHARGE",
            "enregistres": enregistres,
            "deja_enregistres": deja_enregistres,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logging.exception("Erreur prise en charge interne")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de l'enregistrement de la prise en charge",
        )

@router.get("/colis/{colis_id}/actuel", response_model=StatutResponse)
def get_current_statut(
    colis_id: UUID,
    db: Session = Depends(get_db),
):
    statut = statut_service.get_current_statut(db, colis_id)

    if statut is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun statut pour ce colis.",
        )

    return statut


@router.get(
    "/colis/{colis_id}/historique",
    response_model=list[StatutResponse],
)
def get_history(
    colis_id: UUID,
    db: Session = Depends(get_db),
):
    return statut_service.get_history(db, colis_id)
