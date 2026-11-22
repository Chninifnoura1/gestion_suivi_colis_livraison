
from uuid import UUID
import secrets
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.dependencies.auth import get_current_admin, get_current_user
from app.database import get_db
from app.schemas.colis import ColisCreate, ColisUpdate, ColisResponse
from app.services import colis_service
from app.config import settings
import logging

router = APIRouter(
    prefix="/api/colis",
    tags=["Colis"],
)
def _colis_est_parti(db: Session, colis_id: UUID) -> bool:
    result = db.execute(
        text("""
            SELECT EXISTS (
                SELECT 1
                FROM livraison.livraison_colis lc
                JOIN livraison.livraisons l
                    ON l.id = lc.livraison_id
                WHERE lc.colis_id = :colis_id
                  AND l.type_mission = 'TRANSPORT_INTER_AGENCES'
                  AND l.date_depart IS NOT NULL
            )
        """),
        {"colis_id": colis_id},
    )

    return result.scalar()

# CREATE
@router.post(
    "/",
    response_model=ColisResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_colis(
    colis_data: ColisCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    role = current_user["role"]

    if role == "ADMIN":
        agence_id = current_user["agence_id"]

        if agence_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associee a cet administrateur",
            )

    elif role == "SUPER_ADMIN":
        agence_id = colis_data.agence_expedition_id

        if agence_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Veuillez selectionner une agence d'expedition",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces reserve aux administrateurs",
        )

    agency = db.execute(
        text("""
            SELECT id
            FROM agence.agences
            WHERE id = :agency_id
              AND is_active = TRUE
        """),
        {"agency_id": agence_id},
    ).first()

    if agency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agence introuvable ou inactive",
        )

    return colis_service.create_colis(
        db,
        colis_data,
        agence_id,
    )


# READ ALL
@router.get(
    "/",
    response_model=list[ColisResponse],
)
def get_all_colis(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    role = current_user["role"]

    if role == "ADMIN":
        agence_id = current_user["agence_id"]

        if agence_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associee a cet administrateur",
            )
    else:
        agence_id = None

    colis_list = colis_service.get_all_colis(
        db,
        skip,
        limit,
        agence_id,
    )

    for colis in colis_list:
        colis.can_modify = not _colis_est_parti(db, colis.id)

    return colis_list

# GET PARCELS WAITING FOR INTER-AGENCY TRANSPORT
@router.get("/transport-inter-agences")
def get_colis_transport_inter_agences(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if agence_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune agence associee a cet administrateur",
        )

    rows = db.execute(
        text("""
        SELECT
            c.id,
            c.numero_suivi,
            c.description,
            c.poids,
            c.agence_actuelle_id,
            c.agence_destination_id,
            a.nom_agence AS agence_destination,
            a.ville AS ville_destination
        FROM colis.colis c
        JOIN agence.agences a
            ON a.id = c.agence_destination_id
        WHERE c.agence_actuelle_id = :agence_id
        AND c.agence_destination_id IS NOT NULL
        AND c.agence_destination_id <> c.agence_actuelle_id
        AND NOT EXISTS (
            SELECT 1
            FROM livraison.livraison_colis lc
            JOIN livraison.livraisons l
                ON l.id = lc.livraison_id
            WHERE lc.colis_id = c.id
                AND l.etat_livraison::text IN ('EN_ATTENTE', 'EN_TRANSIT')
        )
        ORDER BY c.date_enregistrement DESC
                """),
        {"agence_id": agence_id},
    ).mappings().all()

    return [dict(row) for row in rows]

# GET PARCELS ARRIVED AT AGENCY AND WAITING FOR CLIENT DELIVERY
@router.get("/livraison-client")
def get_colis_livraison_client(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if agence_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune agence associee a cet administrateur",
        )

    rows = db.execute(
        text("""
            SELECT
                c.id,
                c.numero_suivi,
                c.description,
                c.poids,
                c.agence_actuelle_id,
                c.agence_destination_id,
                a.nom_agence AS agence_destination,
                a.ville AS ville_destination,
                dernier_statut.code AS statut
            FROM colis.colis c
            JOIN agence.agences a
                ON a.id = c.agence_destination_id
            JOIN LATERAL (
                SELECT s.code
                FROM statut.historique_statuts hs
                JOIN statut.statuts s
                    ON s.id = hs.statut_id
                WHERE hs.colis_id = c.id
                ORDER BY hs.date_changement DESC, hs.id DESC
                LIMIT 1
            ) dernier_statut ON TRUE
            WHERE c.agence_actuelle_id = :agence_id
              AND c.agence_destination_id = :agence_id
              AND dernier_statut.code = 'ARRIVEE_A_L_AGENCE'
              AND NOT EXISTS (
                  SELECT 1
                  FROM livraison.livraison_colis lc
                  JOIN livraison.livraisons l
                      ON l.id = lc.livraison_id
                  WHERE lc.colis_id = c.id
                    AND l.type_mission = 'LIVRAISON_CLIENT'
                    AND l.etat_livraison::text
                        IN ('EN_ATTENTE', 'EN_TRANSIT')
              )
            ORDER BY c.date_enregistrement DESC
        """),
        {"agence_id": agence_id},
    ).mappings().all()

    return [dict(row) for row in rows]


# INTERNAL: CHECK IF PARCEL EXISTS
@router.get("/internal/{colis_id}/exists")
def check_colis_exists(
    colis_id: UUID,
    x_internal_api_key: str | None = Header(
        default=None,
        alias="X-Internal-API-Key",
    ),
    db: Session = Depends(get_db),
):
    configured_key = settings.INTERNAL_API_KEY

    if (
        not configured_key
        or not x_internal_api_key
        or not secrets.compare_digest(
            x_internal_api_key,
            configured_key,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces interne refuse",
        )

    colis = colis_service.get_colis_by_id(db, colis_id)

    return {"exists": colis is not None}


# INTERNAL: CONFIRM RECEIPT OF AN INTER-AGENCY MISSION
@router.post("/internal/livraisons/{livraison_id}/confirmer-reception")
def confirmer_reception_mission(
    livraison_id: UUID,
    x_internal_api_key: str | None = Header(
        default=None,
        alias="X-Internal-API-Key",
    ),
    db: Session = Depends(get_db),
):
    configured_key = settings.INTERNAL_API_KEY

    if (
        not configured_key
        or not x_internal_api_key
        or not secrets.compare_digest(
            x_internal_api_key,
            configured_key,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces interne refuse",
        )

    try:
        # Lock the mission during confirmation.
        mission = db.execute(
            text("""
                SELECT
                    id,
                    agence_depart_id,
                    agence_arrivee_id,
                    type_mission,
                    etat_livraison::text AS etat_livraison
                FROM livraison.livraisons
                WHERE id = :livraison_id
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if mission is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mission introuvable",
            )

        if mission["type_mission"] != "TRANSPORT_INTER_AGENCES":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette mission n'est pas un transport inter-agences",
            )

        if mission["etat_livraison"] != "ARRIVEE_A_L_AGENCE":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La mission n'est pas encore arrivee a l'agence",
            )

        verification = db.execute(
            text("""
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (
                        WHERE c.agence_actuelle_id
                                IS DISTINCT FROM lc.agence_chargement_id
                        OR c.agence_destination_id
                                IS DISTINCT FROM lc.agence_dechargement_id
                    ) AS invalid
                FROM livraison.livraison_colis lc
                JOIN colis.colis c
                    ON c.id = lc.colis_id
                WHERE lc.livraison_id = :livraison_id
            """),
            {
                "livraison_id": livraison_id,
                "agence_depart_id": mission["agence_depart_id"],
                "agence_arrivee_id": mission["agence_arrivee_id"],
            },
        ).mappings().one()

        if verification["total"] == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucun colis associe a cette mission",
            )

        if verification["invalid"] > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Certains colis ne correspondent pas aux agences de cette mission",
            )

        result = db.execute(
            text("""
                UPDATE colis.colis c
                SET agence_actuelle_id = :agence_arrivee_id
                FROM livraison.livraison_colis lc
                WHERE lc.colis_id = c.id
                  AND lc.livraison_id = :livraison_id
            """),
            {
                "livraison_id": livraison_id,
                "agence_arrivee_id": mission["agence_arrivee_id"],
            },
        )
        db.execute(
            text("""
                UPDATE livraison.livraisons
                SET etat_livraison = 'LIVREE'
                WHERE id = :livraison_id
            """),
            {"livraison_id": livraison_id},
        )
        db.commit()

        return {
            "message": "Reception confirmee avec succes",
            "livraison_id": str(livraison_id),
            "agence_actuelle_id": str(mission["agence_arrivee_id"]),
            "colis_deplaces": result.rowcount,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise



# INTERNAL: CONFIRM RECEIPT AT ONE STOP OF A MULTI-STOP ROUTE
@router.post("/internal/livraisons/{livraison_id}/etapes/{agence_id}/confirmer-reception")
def confirmer_reception_etape(
    livraison_id: UUID,
    agence_id: UUID,
    x_internal_api_key: str | None = Header(
        default=None,
        alias="X-Internal-API-Key",
    ),
        x_utilisateur_id: UUID = Header(
        ...,
        alias="X-Utilisateur-ID",
    ),
    db: Session = Depends(get_db),
):
    configured_key = settings.INTERNAL_API_KEY

    if (
        not configured_key
        or not x_internal_api_key
        or not secrets.compare_digest(x_internal_api_key, configured_key)
    ):
        raise HTTPException(status_code=403, detail="Acces interne refuse")

    def notifier_colis(colis_ids, nom_agence):
        erreurs = 0

        for colis_id in colis_ids:
            try:
                response = httpx.post(
                    f"{settings.NOTIFICATION_SERVICE_URL.rstrip('/')}/notifications/arrivee-agence",
                    headers={
                        "X-Internal-Key": configured_key,
                    },
                    json={
                        "colisId": str(colis_id),
                        "livraisonId": str(livraison_id),
                        "localisation": nom_agence,
                    },
                    timeout=5.0,
                )
                response.raise_for_status()

            except Exception:
                erreurs += 1
                logging.exception(
                    "Echec notification arrivee agence pour colis %s",
                    colis_id,
                )

        return erreurs

    try:
        # 1. Verrouiller la mission.
        mission = db.execute(
            text("""
                SELECT id, type_mission,
                       etat_livraison::text AS etat_livraison
                FROM livraison.livraisons
                WHERE id = :livraison_id
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if mission is None:
            raise HTTPException(status_code=404, detail="Mission introuvable")

        if mission["type_mission"] != "TRANSPORT_INTER_AGENCES":
            raise HTTPException(
                status_code=400,
                detail="Cette mission n'est pas un transport inter-agences",
            )

        # 2. Verrouiller l'etape.
        etape = db.execute(
            text("""
                SELECT id, ordre, etat
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND agence_id = :agence_id
                FOR UPDATE
            """),
            {
                "livraison_id": livraison_id,
                "agence_id": agence_id,
            },
        ).mappings().first()

        if etape is None:
            raise HTTPException(
                status_code=404,
                detail="Etape introuvable dans ce trajet",
            )

        # 3. Recuperer le nom de l'agence.
        agence = db.execute(
            text("""
                SELECT nom_agence
                FROM agence.agences
                WHERE id = :agence_id
            """),
            {"agence_id": agence_id},
        ).mappings().first()

        if agence is None:
            raise HTTPException(status_code=404, detail="Agence introuvable")

        nom_agence = agence["nom_agence"]

        # 4. Cas de nouvelle tentative:
        # l'etape est deja confirmee, on ne deplace rien une deuxieme fois.
        if etape["etat"] == "CONFIRMEE":
            if mission["etat_livraison"] not in (
                "EN_ATTENTE", "EN_TRANSIT", "LIVREE"
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Cette mission n'est plus active",
                )

            colis_finaux = db.execute(
                text("""
                    SELECT DISTINCT c.id
                    FROM livraison.livraison_colis lc
                    JOIN colis.colis c ON c.id = lc.colis_id
                    WHERE lc.livraison_id = :livraison_id
                      AND lc.agence_dechargement_id = :agence_id
                      AND c.agence_destination_id = :agence_id
                      AND c.agence_actuelle_id = :agence_id
                """),
                {
                    "livraison_id": livraison_id,
                    "agence_id": agence_id,
                },
            ).scalars().all()

            db.commit()

            erreurs = notifier_colis(colis_finaux, nom_agence)

            return {
                "message": "Etape deja confirmee",
                "livraison_id": str(livraison_id),
                "agence_id": str(agence_id),
                "colis_deplaces": 0,
                "mission_terminee": mission["etat_livraison"] == "LIVREE",
                "notifications_tentees": len(colis_finaux),
                "notifications_erreurs": erreurs,
            }

        if mission["etat_livraison"] not in ("EN_ATTENTE", "EN_TRANSIT"):
            raise HTTPException(
                status_code=409,
                detail="Cette mission n'est plus active",
            )

        if etape["etat"] != "ARRIVEE":
            raise HTTPException(
                status_code=409,
                detail="Le transporteur n'a pas encore declare son arrivee a cette agence",
            )


        # 5. Recuperer l'agence precedente dans le trajet.
        agence_precedente = db.execute(
            text("""
                SELECT agence_id
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND ordre = :ordre_precedent
            """),
            {
                "livraison_id": livraison_id,
                "ordre_precedent": etape["ordre"] - 1,
            },
        ).scalar_one_or_none()

        if agence_precedente is None:
            raise HTTPException(
                status_code=409,
                detail="Agence precedente introuvable dans le trajet",
            )

        # 6. Verifier les colis qui doivent arriver a cette etape.
        # Un colis doit avoir ete charge avant l'etape actuelle
        # et sa destination doit etre cette etape ou une etape suivante.
        verification = db.execute(
            text("""
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (
                        WHERE c.agence_actuelle_id
                                IS DISTINCT FROM :agence_precedente
                           OR c.agence_destination_id
                                IS DISTINCT FROM lc.agence_dechargement_id
                    ) AS invalid
                FROM livraison.livraison_colis lc
                JOIN colis.colis c
                    ON c.id = lc.colis_id
                JOIN livraison.etapes_trajet ec
                    ON ec.livraison_id = lc.livraison_id
                   AND ec.agence_id = lc.agence_chargement_id
                JOIN livraison.etapes_trajet ed
                    ON ed.livraison_id = lc.livraison_id
                   AND ed.agence_id = lc.agence_dechargement_id
                WHERE lc.livraison_id = :livraison_id
                  AND ec.ordre < :ordre_actuel
                  AND ed.ordre >= :ordre_actuel
            """),
            {
                "livraison_id": livraison_id,
                "agence_precedente": agence_precedente,
                "ordre_actuel": etape["ordre"],
            },
        ).mappings().one()

        if verification["invalid"] > 0:
            raise HTTPException(
                status_code=409,
                detail="Certains colis ne sont pas dans l'agence precedente ou ne correspondent plus a leur destination",
            )

        # 7. Identifier tous les colis qui arrivent a cette agence.
        colis_a_deplacer = db.execute(
            text("""
                SELECT DISTINCT c.id
                FROM livraison.livraison_colis lc
                JOIN colis.colis c
                    ON c.id = lc.colis_id
                JOIN livraison.etapes_trajet ec
                    ON ec.livraison_id = lc.livraison_id
                   AND ec.agence_id = lc.agence_chargement_id
                JOIN livraison.etapes_trajet ed
                    ON ed.livraison_id = lc.livraison_id
                   AND ed.agence_id = lc.agence_dechargement_id
                WHERE lc.livraison_id = :livraison_id
                  AND ec.ordre < :ordre_actuel
                  AND ed.ordre >= :ordre_actuel
                  AND c.agence_actuelle_id = :agence_precedente
                  AND c.agence_destination_id = lc.agence_dechargement_id
            """),
            {
                "livraison_id": livraison_id,
                "ordre_actuel": etape["ordre"],
                "agence_precedente": agence_precedente,
            },
        ).scalars().all()

        # 8. Identifier uniquement les colis arrives a leur destination finale.
        colis_finaux = db.execute(
            text("""
                SELECT DISTINCT c.id
                FROM livraison.livraison_colis lc
                JOIN colis.colis c
                    ON c.id = lc.colis_id
                JOIN livraison.etapes_trajet ec
                    ON ec.livraison_id = lc.livraison_id
                   AND ec.agence_id = lc.agence_chargement_id
                JOIN livraison.etapes_trajet ed
                    ON ed.livraison_id = lc.livraison_id
                   AND ed.agence_id = lc.agence_dechargement_id
                WHERE lc.livraison_id = :livraison_id
                  AND ec.ordre < :ordre_actuel
                  AND ed.ordre = :ordre_actuel
                  AND c.agence_actuelle_id = :agence_precedente
                  AND c.agence_destination_id = :agence_id
            """),
            {
                "livraison_id": livraison_id,
                "ordre_actuel": etape["ordre"],
                "agence_precedente": agence_precedente,
                "agence_id": agence_id,
            },
        ).scalars().all()

        # 9. Deplacer tous les colis vers l'agence actuelle,
        # y compris ceux qui continuent vers une agence suivante.
        result = db.execute(
            text("""
                UPDATE colis.colis c
                SET agence_actuelle_id = :agence_id
                FROM livraison.livraison_colis lc
                JOIN livraison.etapes_trajet ec
                    ON ec.livraison_id = lc.livraison_id
                   AND ec.agence_id = lc.agence_chargement_id
                JOIN livraison.etapes_trajet ed
                    ON ed.livraison_id = lc.livraison_id
                   AND ed.agence_id = lc.agence_dechargement_id
                WHERE lc.colis_id = c.id
                  AND lc.livraison_id = :livraison_id
                  AND ec.ordre < :ordre_actuel
                  AND ed.ordre >= :ordre_actuel
                  AND c.agence_actuelle_id = :agence_precedente
                  AND c.agence_destination_id = lc.agence_dechargement_id
            """),
            {
                "livraison_id": livraison_id,
                "agence_id": agence_id,
                "ordre_actuel": etape["ordre"],
                "agence_precedente": agence_precedente,
            },
        )
        colis_deplaces = result.rowcount

        # 10. Enregistrer le statut selon la destination du colis.
        if colis_a_deplacer:
            statuts_result = db.execute(
                text("""
                    SELECT id, code
                    FROM statut.statuts
                    WHERE code IN ('ARRIVEE_A_L_AGENCE', 'LIVRE')
                """)
            ).mappings().all()

            statuts = {
                row["code"]: row["id"]
                for row in statuts_result
            }

            if "ARRIVEE_A_L_AGENCE" not in statuts:
                raise RuntimeError(
                    "Le statut ARRIVEE_A_L_AGENCE est introuvable"
                )

            if "LIVRE" not in statuts:
                raise RuntimeError(
                    "Le statut LIVRE est introuvable"
                )

            colis_finaux_set = set(colis_finaux)

            for colis_id in colis_a_deplacer:
                est_final = colis_id in colis_finaux_set

                statut_code = (
                    "LIVRE"
                    if est_final
                    else "ARRIVEE_A_L_AGENCE"
                )

                commentaire = (
                    "Colis arrive a son agence de destination "
                    "et disponible pour retrait"
                    if est_final
                    else "Colis arrive a une agence intermediaire du trajet"
                )

                db.execute(
                    text("""
                        INSERT INTO statut.historique_statuts (
                            colis_id,
                            statut_id,
                            utilisateur_id,
                            localisation,
                            commentaire
                        )
                        SELECT
                            :colis_id,
                            :statut_id,
                            :utilisateur_id,
                            :localisation,
                            :commentaire
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM statut.historique_statuts h
                            WHERE h.colis_id = :colis_id
                              AND h.statut_id = :statut_id
                              AND h.localisation = :localisation
                        )
                    """),
                    {
                        "colis_id": colis_id,
                        "statut_id": statuts[statut_code],
                        "utilisateur_id": x_utilisateur_id,
                        "localisation": nom_agence,
                        "commentaire": commentaire,
                    },
                )


        # 9. Confirmer l'etape actuelle.
        db.execute(
            text("""
                UPDATE livraison.etapes_trajet
                SET etat = 'CONFIRMEE',
                    date_confirmation = NOW()
                WHERE id = :etape_id
            """),
            {"etape_id": etape["id"]},
        )

        # 10. Activer l'etape suivante ou terminer la mission.
        etape_suivante = db.execute(
            text("""
                SELECT id
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND ordre > :ordre
                ORDER BY ordre
                LIMIT 1
                FOR UPDATE
            """),
            {
                "livraison_id": livraison_id,
                "ordre": etape["ordre"],
            },
        ).mappings().first()

        if etape_suivante:
            db.execute(
                text("""
                    UPDATE livraison.etapes_trajet
                    SET etat = 'EN_COURS'
                    WHERE id = :etape_id
                """),
                {"etape_id": etape_suivante["id"]},
            )
            mission_terminee = False
        else:
            db.execute(
                text("""
                    UPDATE livraison.livraisons
                    SET etat_livraison = 'LIVREE',
                        date_arrivee_reelle = NOW()
                    WHERE id = :livraison_id
                """),
                {"livraison_id": livraison_id},
            )
            mission_terminee = True

        # 11. Valider les modifications en base avant l'envoi des emails.
        db.commit()

        # 12. Notifier uniquement les colis arrives a leur destination finale.
        erreurs = notifier_colis(colis_finaux, nom_agence)

        return {
            "message": "Reception de l'etape confirmee",
            "livraison_id": str(livraison_id),
            "agence_id": str(agence_id),
            "colis_deplaces": colis_deplaces,
            "mission_terminee": mission_terminee,
            "notifications_tentees": len(colis_finaux),
            "notifications_erreurs": erreurs,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logging.exception(
            "Erreur lors de la confirmation de reception de l'etape"
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors de la confirmation de l'etape",
        )


# PUBLIC TRACKING - No authentication required
@router.get("/suivi/{numero_suivi}")
def suivre_colis_public(
    numero_suivi: str,
    db: Session = Depends(get_db),
):
    code = numero_suivi.strip().upper()

    colis = db.execute(
        text("""
            SELECT
                c.id,
                c.numero_suivi,
                c.date_enregistrement,
                c.expediteur_ville,
                c.destinataire_ville,
                aa.nom_agence AS agence_nom,
                aa.telephone AS agence_telephone,
                aa.adresse AS agence_adresse
            FROM colis.colis c
            LEFT JOIN agence.agences aa
                ON aa.id = c.agence_actuelle_id
            WHERE UPPER(TRIM(c.numero_suivi)) = :code
            LIMIT 1
        """),
        {"code": code},
    ).mappings().first()

    if colis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Numéro de suivi introuvable",
        )

    historique = db.execute(
        text("""
            SELECT
                s.code,
                s.libelle,
                hs.date_changement,
                hs.localisation
            FROM statut.historique_statuts hs
            JOIN statut.statuts s
                ON s.id = hs.statut_id
            WHERE hs.colis_id = :colis_id
            ORDER BY hs.date_changement ASC, hs.id ASC
        """),
        {"colis_id": colis["id"]},
    ).mappings().all()

    dernier_statut = (
        historique[-1]["code"] if historique else "CREE"
    )

    return {
        "id": str(colis["id"]),
        "numero_suivi": colis["numero_suivi"],
        "status_code": dernier_statut,
        "date_enregistrement": colis["date_enregistrement"],
        "fromCity": colis["expediteur_ville"],
        "toCity": colis["destinataire_ville"],
        "agency": {
            "name": colis["agence_nom"],
            "phone": colis["agence_telephone"],
            "address": colis["agence_adresse"],
        } if colis["agence_nom"] else None,
        "events": [
            {
                "status_code": event["code"],
                "label": event["libelle"],
                "at": event["date_changement"],
                "city": event["localisation"],
            }
            for event in historique
        ],
    }

# READ BY ID
@router.get(
    "/{colis_id}",
    response_model=ColisResponse,
)
def get_colis_by_id(
    colis_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    colis = colis_service.get_colis_by_id(db, colis_id)

    if colis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colis introuvable",
        )

    role = current_user["role"]

    if role == "ADMIN":
        agence_id = current_user["agence_id"]

        if agence_id is None or colis.agence_actuelle_id != agence_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Colis introuvable",
            )

    elif role == "LIVREUR":
        assigned = db.execute(
            text("""
                SELECT 1
                FROM livraison.livraison_colis lc
                JOIN livraison.livraisons l
                    ON l.id = lc.livraison_id
                WHERE lc.colis_id = :colis_id
                  AND l.livreur_id = :livreur_id
                LIMIT 1
            """),
            {
                "colis_id": colis_id,
                "livreur_id": current_user["id"],
            },
        ).first()

        if assigned is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Colis introuvable",
            )

    elif role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces refuse",
        )
    colis.can_modify = not _colis_est_parti(db, colis_id)
    return colis


# UPDATE
@router.patch(
    "/{colis_id}",
    response_model=ColisResponse,
)
def update_colis(
    colis_id: UUID,
    colis_data: ColisUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    existing_colis = colis_service.get_colis_by_id(db, colis_id)

    if existing_colis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colis introuvable",
        )

    if _colis_est_parti(db, colis_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de modifier ce colis : il a deja quitte son agence d'expedition",
        )

    if current_user["role"] == "ADMIN":
        agence_id = current_user["agence_id"]

        if (
            agence_id is None
            or existing_colis.agence_actuelle_id != agence_id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Colis introuvable",
            )

    return colis_service.update_colis(
        db,
        colis_id,
        colis_data,
    )


# DELETE
@router.delete(
    "/{colis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_colis(
    colis_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le SUPER_ADMIN peut supprimer un colis",
        )

    deleted = colis_service.delete_colis(db, colis_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colis introuvable",
        )
