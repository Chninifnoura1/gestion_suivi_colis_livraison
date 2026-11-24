from uuid import UUID
import logging
import os
import httpx
from uuid import uuid4
from sqlalchemy import text
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from app.database import get_db
from app.dependencies.auth import (
    get_current_admin,
    get_current_livreur,
    get_current_livraison_user,
)
from app.schemas.livraison import (
    LivraisonCreate,
    LivraisonUpdate,
    LivraisonResponse,
    LivraisonLivreurUpdate,
    LivraisonAffectationCreate,
    LivraisonMultiEtapesCreate,
    AjouterColisEtapeCreate,
)
from app.services import livraison_service

logger = logging.getLogger(__name__)
def notifier_livreur_affectation(
    livreur_id,
    livraison_id,
    title,
    message,
):
    notification_service_url = os.getenv("NOTIFICATION_SERVICE_URL")
    internal_api_key = os.getenv("INTERNAL_API_KEY")

    if not notification_service_url or not internal_api_key:
        logger.error("Configuration notification-service manquante")
        return

    try:
        response = httpx.post(
            f"{notification_service_url}/notifications/livreurs",
            headers={
                "X-Internal-Key": internal_api_key,
            },
            json={
                "livreur_id": str(livreur_id),
                "livraison_id": str(livraison_id),
                "title": title,
                "message": message,
                "category": "Affectation",
            },
            timeout=5.0,
        )

        response.raise_for_status()

        logger.info(
            "Notification affectation envoyee au livreur %s",
            livreur_id,
        )

    except Exception:
        logger.exception(
            "Erreur lors de l'envoi de notification au livreur %s",
            livreur_id,
        )
router = APIRouter(
    prefix="/api/livraisons",
    tags=["Livraisons"],
)



def notifier_admin_arrivee(admin_id, agence_id, livraison_id):
    notification_service_url = os.getenv("NOTIFICATION_SERVICE_URL")
    internal_api_key = os.getenv("INTERNAL_API_KEY")

    if not notification_service_url or not internal_api_key:
        logger.error("Configuration notification-service manquante")
        return

    try:
        response = httpx.post(
            f"{notification_service_url}/notifications/admins",
            headers={
                "X-Internal-Key": internal_api_key,
            },
            json={
                "admin_id": str(admin_id),
                "agence_id": str(agence_id),
                "livraison_id": str(livraison_id),
                "title": "Arrivée du livreur à l'agence",
                "message": (
                    "Le livreur est arrivé. "
                    "Veuillez confirmer la réception des colis."
                ),
                "category": "Système",
            },
            timeout=5.0,
        )

        response.raise_for_status()

        logger.info(
            "Notification d'arrivee envoyee a l'administrateur %s",
            admin_id,
        )

    except Exception:
        logger.exception(
            "Erreur lors de l'envoi de notification a l'administrateur %s",
            admin_id,
        )
@router.get("/notifications/livreur")
def get_notifications_livreur(
    current_user=Depends(get_current_livreur),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                id,
                livraison_id,
                category,
                title,
                message,
                is_read,
                created_at
            FROM notification.notifications_livreurs
            WHERE livreur_id = :livreur_id
            ORDER BY created_at DESC
        """),
        {"livreur_id": current_user["id"]},
    ).mappings().all()

    return [
        {
            **dict(row),
            "id": str(row["id"]),
            "livraison_id": str(row["livraison_id"]),
            "read": row["is_read"],
        }
        for row in rows
    ]


@router.patch("/notifications/livreur/{notification_id}/read")
def mark_notification_livreur_read(
    notification_id: UUID,
    current_user=Depends(get_current_livreur),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            UPDATE notification.notifications_livreurs
            SET is_read = TRUE
            WHERE id = :notification_id
              AND livreur_id = :livreur_id
            RETURNING id
        """),
        {
            "notification_id": notification_id,
            "livreur_id": current_user["id"],
        },
    ).first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Notification introuvable",
        )

    db.commit()

    return {"message": "Notification marquee comme lue"}
@router.get("/notifications/admin")
def get_notifications_admin(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    rows = db.execute(
        text("""
            SELECT
                id,
                livraison_id,
                agence_id,
                category,
                title,
                message,
                is_read,
                created_at
            FROM notification.notifications_admins
            WHERE admin_id = :admin_id
              AND agence_id = :agence_id
            ORDER BY created_at DESC
        """),
        {
            "admin_id": current_user["id"],
            "agence_id": agence_id,
        },
    ).mappings().all()

    return [
        {
            **dict(row),
            "id": str(row["id"]),
            "livraison_id": str(row["livraison_id"]),
            "agence_id": str(row["agence_id"]),
            "read": row["is_read"],
        }
        for row in rows
    ]


@router.patch("/notifications/admin/{notification_id}/read")
def mark_notification_admin_read(
    notification_id: UUID,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    row = db.execute(
        text("""
            UPDATE notification.notifications_admins
            SET is_read = TRUE
            WHERE id = :notification_id
              AND admin_id = :admin_id
              AND agence_id = :agence_id
            RETURNING id
        """),
        {
            "notification_id": notification_id,
            "admin_id": current_user["id"],
            "agence_id": agence_id,
        },
    ).first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Notification introuvable",
        )

    db.commit()

    return {"message": "Notification marquee comme lue"}
@router.post(
    "/",
    response_model=LivraisonResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_livraison(
    livraison_data: LivraisonCreate,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return livraison_service.create_livraison(db, livraison_data)

@router.patch("/{livraison_id}/statut", response_model=LivraisonResponse)
def update_livraison_statut_livreur(
    livraison_id: UUID,
    update_data: LivraisonLivreurUpdate,
    current_user=Depends(get_current_livreur),
    db: Session = Depends(get_db),
):
    new_status = update_data.etat_livraison

    if new_status is None:
        raise HTTPException(
            status_code=400,
            detail="Le nouveau statut est obligatoire",
        )

    mission = db.execute(
        text("""
            SELECT
                id,
                livreur_id,
                type_mission,
                etat_livraison::text AS etat_livraison,
                date_depart,
                date_arrivee_reelle
            FROM livraison.livraisons
            WHERE id = :livraison_id
            FOR UPDATE
        """),
        {"livraison_id": livraison_id},
    ).mappings().first()

    if mission is None:
        raise HTTPException(status_code=404, detail="Mission introuvable")

    if mission["livreur_id"] != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Cette mission ne vous est pas affectee",
        )

    mission_type = mission["type_mission"]
    current_status = mission["etat_livraison"]
    new_status = new_status.value

    allowed_transitions = {
        "TRANSPORT_INTER_AGENCES": {
            "EN_ATTENTE": "EN_TRANSIT",
            "EN_TRANSIT": "ARRIVEE_A_L_AGENCE",
        },
        "LIVRAISON_CLIENT": {
            "EN_ATTENTE": "EN_TRANSIT",
            "EN_TRANSIT": "LIVREE",
        },
    }

    expected_status = allowed_transitions.get(
        mission_type, {}
    ).get(current_status)

    if expected_status != new_status:
        raise HTTPException(
            status_code=409,
            detail="Transition de statut non autorisee pour cette mission",
        )

    if mission_type == "TRANSPORT_INTER_AGENCES":
        if new_status == "LIVREE":
            raise HTTPException(
                status_code=403,
                detail="Le transporteur ne peut pas marquer un colis comme livre au client",
            )

    if mission_type == "LIVRAISON_CLIENT":
        if new_status == "ARRIVEE_A_L_AGENCE":
            raise HTTPException(
                status_code=403,
                detail="Cette mission concerne la livraison au client",
            )

    if new_status == "EN_TRANSIT":
        db.execute(
            text("""
                UPDATE livraison.livraisons
                SET etat_livraison = CAST(:new_status AS livraison.etat_livraison),
                    date_depart = COALESCE(date_depart, NOW())
                WHERE id = :livraison_id
            """),
            {
                "new_status": new_status,
                "livraison_id": livraison_id,
            },
        )
    else:
        db.execute(
            text("""
                UPDATE livraison.livraisons
                SET etat_livraison = CAST(:new_status AS livraison.etat_livraison),
                    date_arrivee_reelle = NOW()
                WHERE id = :livraison_id
            """),
            {
                "new_status": new_status,
                "livraison_id": livraison_id,
            },
        )

    db.commit()

    updated = livraison_service.get_livraison_by_id(db, livraison_id)
    return updated


@router.post("/{livraison_id}/confirmer-reception")
def confirmer_reception(
    livraison_id: UUID,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Only the destination agency ADMIN can confirm receipt.
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul l'administrateur de l'agence destinataire peut confirmer la reception",
        )

    agence_id = current_user["agence_id"]

    if agence_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune agence associee a cet administrateur",
        )

    mission = db.execute(
        text("""
            SELECT
                id,
                agence_arrivee_id,
                type_mission,
                etat_livraison::text AS etat_livraison
            FROM livraison.livraisons
            WHERE id = :livraison_id
        """),
        {"livraison_id": livraison_id},
    ).mappings().first()

    if mission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission introuvable",
        )

    if mission["agence_arrivee_id"] != agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette mission ne concerne pas votre agence",
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

    colis_service_url = os.getenv("COLIS_SERVICE_URL")
    internal_api_key = os.getenv("INTERNAL_API_KEY")

    if not colis_service_url or not internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuration du service colis manquante",
        )

    try:
        response = httpx.post(
            f"{colis_service_url}/api/colis/internal/livraisons/{livraison_id}/confirmer-reception",
            headers={
                "X-Internal-API-Key": internal_api_key,
                "X-Utilisateur-ID": str(current_user["id"]),
            },
            timeout=15,
        )

        response.raise_for_status()

        return response.json()

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Impossible de contacter le service colis",
        )

# CONFIRMER LA RECEPTION D'UNE ETAPE DU TRAJET
@router.post("/{livraison_id}/etapes/{agence_id}/confirmer-reception")
def confirmer_reception_etape_livraison(
    livraison_id: UUID,
    agence_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    agence_admin_id = current_user["agence_id"]

    if not agence_admin_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee a cet administrateur",
        )

    if str(agence_admin_id) != str(agence_id):
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez confirmer que la reception de votre agence",
        )

    mission = db.execute(
        text("""
                SELECT id, livreur_id, type_mission,
                    etat_livraison::text AS etat_livraison
            FROM livraison.livraisons
            WHERE id = :livraison_id
        """),
        {"livraison_id": livraison_id},
    ).mappings().first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")

    if mission["type_mission"] != "TRANSPORT_INTER_AGENCES":
        raise HTTPException(
            status_code=400,
            detail="Cette mission n'est pas un transport inter-agences",
        )

    if mission["etat_livraison"] not in ("EN_ATTENTE", "EN_TRANSIT"):
        raise HTTPException(
            status_code=409,
            detail="Cette mission n'est pas active",
        )

    etape = db.execute(
        text("""
            SELECT id, etat
            FROM livraison.etapes_trajet
            WHERE livraison_id = :livraison_id
              AND agence_id = :agence_id
        """),
        {
            "livraison_id": livraison_id,
            "agence_id": agence_id,
        },
    ).mappings().first()

    if not etape:
        raise HTTPException(
            status_code=404,
            detail="Cette agence ne fait pas partie du trajet",
        )

    if etape["etat"] != "ARRIVEE":
        raise HTTPException(
            status_code=409,
            detail="Le transporteur n'a pas encore declare son arrivee",
        )

    colis_service_url = os.getenv("COLIS_SERVICE_URL")
    internal_api_key = os.getenv("INTERNAL_API_KEY")

    if not colis_service_url or not internal_api_key:
        raise HTTPException(
            status_code=500,
            detail="Configuration du service colis manquante",
        )

    try:
        response = httpx.post(
            f"{colis_service_url}/api/colis/internal/livraisons/{livraison_id}/etapes/{agence_id}/confirmer-reception",
            headers={
                "X-Internal-API-Key": internal_api_key,
                "X-Utilisateur-ID": str(current_user["id"]),
            },
            timeout=15,
        )

        response.raise_for_status()
        resultat = response.json()

        # Reactiver le transporteur uniquement a la fin du trajet
        if resultat.get("mission_terminee") is True:
            agence_finale = db.execute(
                text("""
                    SELECT ville
                    FROM agence.agences
                    WHERE id = :agence_id
                """),
                {"agence_id": agence_id},
            ).mappings().first()

            if not agence_finale:
                raise HTTPException(
                    status_code=404,
                    detail="Agence finale introuvable",
                )

            db.execute(
                text("""
                    UPDATE auth.users
                    SET disponible = TRUE,
                        ville_actuelle = :ville
                    WHERE id = :livreur_id
                """),
                {
                    "livreur_id": mission["livreur_id"],
                    "ville": agence_finale["ville"],
                },
            )

            db.commit()

        return resultat

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Impossible de contacter le service colis",
        )

@router.get("/", response_model=list[LivraisonResponse])
def get_all_livraisons(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    current_user=Depends(get_current_livreur),
    db: Session = Depends(get_db),
):
    return livraison_service.get_livraisons_by_livreur(
        db,
        current_user["id"],
        skip,
        limit,
    )

@router.get("/mes-trajets")
def get_mes_trajets(
    current_user=Depends(get_current_livreur),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
            SELECT
                l.id AS livraison_id,
                l.etat_livraison,
                l.ville_depart,
                l.ville_arrivee,
                l.date_depart,
                l.date_arrivee_prevue,

                et.id AS etape_id,
                et.agence_id,
                et.ordre,
                et.etat AS etat_etape,
                et.date_arrivee_reelle,
                et.date_confirmation,

                a.nom_agence,
                a.ville AS ville_agence,

                lc.id AS livraison_colis_id,
                lc.colis_id,
                lc.agence_chargement_id,
                lc.agence_dechargement_id,

                c.numero_suivi,
                c.description,
                c.poids,
                c.destinataire_nom,
                c.destinataire_telephone,
                c.destinataire_adresse,
                c.destinataire_ville

            FROM livraison.livraisons l

            LEFT JOIN livraison.etapes_trajet et
                ON et.livraison_id = l.id

            LEFT JOIN agence.agences a
                ON a.id = et.agence_id

            LEFT JOIN livraison.livraison_colis lc
                ON lc.livraison_id = l.id
                AND lc.agence_dechargement_id = et.agence_id

            LEFT JOIN colis.colis c
                ON c.id = lc.colis_id

            WHERE l.livreur_id = :livreur_id
              AND l.type_mission = 'TRANSPORT_INTER_AGENCES'
              AND l.etat_livraison::text IN ('EN_ATTENTE', 'EN_TRANSIT')

            ORDER BY l.created_at DESC, et.ordre ASC,
                     lc.date_tentative ASC
        """),
        {"livreur_id": current_user["id"]},
    ).mappings().all()

    trajets = {}
    etapes_maps = {}

    for row in result:
        livraison_id = row["livraison_id"]

        if livraison_id not in trajets:
            trajets[livraison_id] = {
                "id": livraison_id,
                "etat_livraison": row["etat_livraison"],
                "ville_depart": row["ville_depart"],
                "ville_arrivee": row["ville_arrivee"],
                "date_depart": row["date_depart"],
                "date_arrivee_prevue": row["date_arrivee_prevue"],
                "etapes": [],
            }
            etapes_maps[livraison_id] = {}

        if row["etape_id"] is None:
            continue

        etape_id = row["etape_id"]
        etapes = etapes_maps[livraison_id]

        if etape_id not in etapes:
            etape = {
                "id": etape_id,
                "agence_id": row["agence_id"],
                "ordre": row["ordre"],
                "etat": row["etat_etape"],
                "date_arrivee_reelle": row["date_arrivee_reelle"],
                "date_confirmation": row["date_confirmation"],
                "nom_agence": row["nom_agence"],
                "ville": row["ville_agence"],
                "colis": [],
            }

            etapes[etape_id] = etape
            trajets[livraison_id]["etapes"].append(etape)

        if row["colis_id"] is not None:
            etapes[etape_id]["colis"].append({
                "id": row["colis_id"],
                "livraison_colis_id": row["livraison_colis_id"],
                "numero_suivi": row["numero_suivi"],
                "description": row["description"],
                "poids": row["poids"],
                "destinataire_nom": row["destinataire_nom"],
                "destinataire_telephone": row["destinataire_telephone"],
                "destinataire_adresse": row["destinataire_adresse"],
                "destinataire_ville": row["destinataire_ville"],
                "agence_chargement_id": row["agence_chargement_id"],
                "agence_dechargement_id": row["agence_dechargement_id"],
            })

    return list(trajets.values())

@router.get("/chargement-colis")
def get_trajets_pour_chargement(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    agence_id = current_user.get("agence_id")

    if not agence_id:
        raise HTTPException(
            status_code=400,
            detail="Aucune agence associée à cet administrateur.",
        )

    result = db.execute(
        text("""
            SELECT
                l.id AS livraison_id,
                l.etat_livraison,
                l.ville_depart,
                l.ville_arrivee,
                et.id AS etape_id,
                et.agence_id,
                et.ordre,
                et.etat AS etat_etape,
                a.nom_agence,
                a.ville AS ville_agence
            FROM livraison.livraisons l
            JOIN livraison.etapes_trajet et
                ON et.livraison_id = l.id
            JOIN agence.agences a
                ON a.id = et.agence_id
            WHERE
                l.type_mission = 'TRANSPORT_INTER_AGENCES'
                AND l.etat_livraison::text IN ('EN_ATTENTE', 'EN_TRANSIT')
                AND EXISTS (
                    SELECT 1
                    FROM livraison.etapes_trajet actuelle
                    WHERE actuelle.livraison_id = l.id
                      AND actuelle.agence_id = :agence_id
                      AND actuelle.etat IN ('EN_COURS', 'ARRIVEE', 'CONFIRMEE')
                )
            ORDER BY l.created_at DESC, et.ordre ASC
        """),
        {"agence_id": agence_id},
    ).mappings().all()

    trajets = {}

    for row in result:
        livraison_id = str(row["livraison_id"])

        if livraison_id not in trajets:
            trajets[livraison_id] = {
                "livraison_id": livraison_id,
                "etat_livraison": row["etat_livraison"],
                "ville_depart": row["ville_depart"],
                "ville_arrivee": row["ville_arrivee"],
                "etapes": [],
            }

        trajets[livraison_id]["etapes"].append({
            "etape_id": str(row["etape_id"]),
            "agence_id": str(row["agence_id"]),
            "ordre": row["ordre"],
            "etat": row["etat_etape"],
            "nom_agence": row["nom_agence"],
            "ville": row["ville_agence"],
            "est_agence_admin": str(row["agence_id"]) == str(agence_id),
        })

    return list(trajets.values())
@router.get("/reception-inter-agences")
def get_reception_inter_agences(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    agence_id = current_user.get("agence_id")

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    rows = db.execute(
        text("""
            SELECT
                l.id AS livraison_id,
                l.etat_livraison,
                l.ville_depart,
                l.ville_arrivee,
                et.id AS etape_id,
                et.ordre,
                et.etat AS etat_etape,
                et.date_arrivee_reelle,
                a.nom_agence,
                a.ville AS ville_agence,
                lc.id AS livraison_colis_id,
                lc.colis_id,
                lc.agence_chargement_id,
                lc.agence_dechargement_id,
                c.numero_suivi,
                c.description,
                c.poids,
                c.destinataire_nom,
                c.destinataire_telephone,
                c.destinataire_adresse,
                c.destinataire_ville
            FROM livraison.livraisons l
            JOIN livraison.etapes_trajet et
                ON et.livraison_id = l.id
            JOIN agence.agences a
                ON a.id = et.agence_id
            LEFT JOIN livraison.livraison_colis lc
                ON lc.livraison_id = l.id
                AND lc.agence_dechargement_id = et.agence_id
            LEFT JOIN colis.colis c
                ON c.id = lc.colis_id
            WHERE l.type_mission = 'TRANSPORT_INTER_AGENCES'
                AND l.etat_livraison::text IN ('EN_ATTENTE', 'EN_TRANSIT')
                AND et.agence_id = :agence_id
                AND et.etat::text = 'ARRIVEE'
            ORDER BY l.created_at DESC, et.ordre ASC
        """),
        {"agence_id": agence_id},
    ).mappings().all()

    trajets = {}

    for row in rows:
        livraison_id = str(row["livraison_id"])

        if livraison_id not in trajets:
            trajets[livraison_id] = {
                "livraison_id": livraison_id,
                "etat_livraison": row["etat_livraison"],
                "ville_depart": row["ville_depart"],
                "ville_arrivee": row["ville_arrivee"],
                "etape": {
                    "etape_id": str(row["etape_id"]),
                    "agence_id": str(row["agence_dechargement_id"] or agence_id),
                    "ordre": row["ordre"],
                    "etat": row["etat_etape"],
                    "date_arrivee_reelle": row["date_arrivee_reelle"],
                    "nom_agence": row["nom_agence"],
                    "ville": row["ville_agence"],
                },
                "colis": [],
            }

        if row["colis_id"] is not None:
            trajets[livraison_id]["colis"].append({
                "id": str(row["colis_id"]),
                "livraison_colis_id": str(row["livraison_colis_id"]),
                "numero_suivi": row["numero_suivi"],
                "description": row["description"],
                "poids": row["poids"],
                "destinataire_nom": row["destinataire_nom"],
                "destinataire_telephone": row["destinataire_telephone"],
                "destinataire_adresse": row["destinataire_adresse"],
                "destinataire_ville": row["destinataire_ville"],
                "agence_chargement_id": str(row["agence_chargement_id"]),
                "agence_dechargement_id": str(row["agence_dechargement_id"]),
            })

    return list(trajets.values())

@router.get("/admin/trajets")
def get_trajets_admin(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    agence_id = current_user.get("agence_id")

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    rows = db.execute(
        text("""
            SELECT
                l.id AS trajet_id,
                l.etat_livraison::text AS etat_livraison,
                l.ville_depart,
                l.ville_arrivee,
                l.date_depart,
                l.date_arrivee_prevue,
                l.date_arrivee_reelle,
                l.created_at,

                l.livreur_id,
                COALESCE(
                    u.prenom || ' ' || u.nom,
                    'Non affecte'
                ) AS livreur_nom,
                u.email AS livreur_email,

                et.id AS etape_id,
                et.agence_id,
                et.ordre,
                et.etat::text AS etat_etape,
                et.date_arrivee_reelle AS etape_date_arrivee,
                et.date_confirmation,

                a.nom_agence,
                a.ville AS ville_agence,

                lc.id AS livraison_colis_id,
                lc.colis_id,
                lc.agence_chargement_id,
                lc.agence_dechargement_id,

                c.numero_suivi,
                c.description,
                c.poids,
                c.destinataire_nom,
                c.destinataire_ville

            FROM livraison.livraisons l

            LEFT JOIN auth.users u
                ON u.id = l.livreur_id

            LEFT JOIN livraison.etapes_trajet et
                ON et.livraison_id = l.id

            LEFT JOIN agence.agences a
                ON a.id = et.agence_id

            LEFT JOIN livraison.livraison_colis lc
                ON lc.livraison_id = l.id

            LEFT JOIN colis.colis c
                ON c.id = lc.colis_id

            WHERE l.type_mission = 'TRANSPORT_INTER_AGENCES'
              AND EXISTS (
                  SELECT 1
                  FROM livraison.etapes_trajet agence_etape
                  WHERE agence_etape.livraison_id = l.id
                    AND agence_etape.agence_id = :agence_id
              )

            ORDER BY l.created_at DESC, et.ordre ASC,
                     lc.date_tentative ASC

        """),
        {"agence_id": agence_id},
    ).mappings().all()

    trajets = {}
    etapes_maps = {}
    colis_maps = {}

    for row in rows:
        trajet_id = str(row["trajet_id"])

        if trajet_id not in trajets:
            trajets[trajet_id] = {
                "id": trajet_id,
                "etat_livraison": row["etat_livraison"],
                "ville_depart": row["ville_depart"],
                "ville_arrivee": row["ville_arrivee"],
                "date_depart": row["date_depart"].isoformat()
                    if row["date_depart"] else None,
                "date_arrivee_prevue": row["date_arrivee_prevue"].isoformat()
                    if row["date_arrivee_prevue"] else None,
                "date_arrivee_reelle": row["date_arrivee_reelle"].isoformat()
                    if row["date_arrivee_reelle"] else None,
                "created_at": row["created_at"].isoformat()
                    if row["created_at"] else None,
                "livreur_id": str(row["livreur_id"])
                    if row["livreur_id"] else None,
                "livreur_nom": row["livreur_nom"],
                "livreur_email": row["livreur_email"],
                "etapes": [],
                "colis": [],
            }
            etapes_maps[trajet_id] = set()
            colis_maps[trajet_id] = set()

        if row["etape_id"] is not None:
            etape_id = str(row["etape_id"])

            if etape_id not in etapes_maps[trajet_id]:
                etapes_maps[trajet_id].add(etape_id)

                trajets[trajet_id]["etapes"].append({
                    "id": etape_id,
                    "agence_id": str(row["agence_id"]),
                    "ordre": row["ordre"],
                    "etat": row["etat_etape"],
                    "date_arrivee_reelle": (
                        row["etape_date_arrivee"].isoformat()
                        if row["etape_date_arrivee"] else None
                    ),
                    "date_confirmation": (
                        row["date_confirmation"].isoformat()
                        if row["date_confirmation"] else None
                    ),
                    "nom_agence": row["nom_agence"],
                    "ville": row["ville_agence"],
                })

        if row["colis_id"] is not None:
            colis_id = str(row["colis_id"])

            if colis_id not in colis_maps[trajet_id]:
                colis_maps[trajet_id].add(colis_id)

                trajets[trajet_id]["colis"].append({
                    "id": colis_id,
                    "livraison_colis_id": (
                        str(row["livraison_colis_id"])
                        if row["livraison_colis_id"] else None
                    ),
                    "numero_suivi": row["numero_suivi"],
                    "description": row["description"],
                    "poids": row["poids"],
                    "destinataire_nom": row["destinataire_nom"],
                    "destinataire_ville": row["destinataire_ville"],
                    "agence_chargement_id": (
                        str(row["agence_chargement_id"])
                        if row["agence_chargement_id"] else None
                    ),
                    "agence_dechargement_id": (
                        str(row["agence_dechargement_id"])
                        if row["agence_dechargement_id"] else None
                    ),
                })

    result = list(trajets.values())
    return result[skip:skip + limit]

@router.get("/admin")
def get_livraisons_admin(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not current_user["agence_id"]:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    rows = db.execute(
        text("""
            SELECT
                l.id,
                l.livreur_id,
                l.agence_depart_id,
                l.agence_arrivee_id,
                l.type_mission,
                l.ville_depart,
                l.ville_arrivee,
                l.date_depart,
                l.date_arrivee_prevue,
                l.date_arrivee_reelle,
                l.etat_livraison::text AS etat_livraison,
                l.created_at,
                u.nom,
                u.prenom,
                u.email AS livreur_email
            FROM livraison.livraisons l
            JOIN auth.users u ON u.id = l.livreur_id
            WHERE
                l.agence_arrivee_id = :agence_id
                AND l.type_mission = 'TRANSPORT_INTER_AGENCES'
                AND l.etat_livraison = 'ARRIVEE_A_L_AGENCE'
            ORDER BY l.created_at DESC
            OFFSET :skip
            LIMIT :limit
        """),
        {
            "agence_id": current_user["agence_id"],
            "skip": skip,
            "limit": limit,
        },
    ).mappings().all()

    return [dict(row) for row in rows]
@router.get("/{livraison_id:uuid}", response_model=LivraisonResponse)
def get_livraison_by_id(
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

    return livraison


# GET COURIERS ELIGIBLE FOR INTER-AGENCY TRANSPORT
@router.get("/livreurs-transport")
def get_livreurs_transport(
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

    agence = db.execute(
        text("""
            SELECT ville
            FROM agence.agences
            WHERE id = :agence_id
              AND is_active = TRUE
        """),
        {"agence_id": agence_id},
    ).mappings().first()

    if agence is None:
        raise HTTPException(
            status_code=404,
            detail="Agence introuvable ou inactive",
        )

    rows = db.execute(
        text("""
            SELECT
                u.id,
                u.email,
                u.telephone,
                u.ville_actuelle,
                u.disponible
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            WHERE r.nom = 'LIVREUR'
              AND u.is_active = TRUE
              AND u.disponible = TRUE
              AND u.peut_transport = TRUE
              AND LOWER(TRIM(u.ville_actuelle)) =
                  LOWER(TRIM(:ville_depart))
              AND NOT EXISTS (
                  SELECT 1
                  FROM livraison.livraisons l
                  WHERE l.livreur_id = u.id
                    AND l.etat_livraison::text
                        IN ('EN_ATTENTE', 'EN_TRANSIT')
              )
            ORDER BY u.email
        """),
        {"ville_depart": agence["ville"]},
    ).mappings().all()

    return [dict(row) for row in rows]
# CREATE INTER-AGENCY TRANSPORT AND ASSIGN MULTIPLE PARCELS
@router.post("/affectation-inter-agences", status_code=201)
def affecter_colis_transport_inter_agences(
    affectation: LivraisonAffectationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")

    agence_id = current_user["agence_id"]

    if not agence_id:
        raise HTTPException(status_code=403, detail="Aucune agence associee")

    colis_ids = affectation.colis_ids

    if not colis_ids or len(colis_ids) != len(set(colis_ids)):
        raise HTTPException(status_code=400, detail="Liste de colis invalide ou doublons")

    try:
        # 1. Verify departure agency
        agence = db.execute(
            text("""
                SELECT id, ville
                FROM agence.agences
                WHERE id = :agence_id
                  AND is_active = TRUE
            """),
            {"agence_id": agence_id},
        ).mappings().first()

        if agence is None:
            raise HTTPException(status_code=404, detail="Agence introuvable ou inactive")

        # 2. Verify courier eligibility
        livreur = db.execute(
            text("""
                SELECT u.id
                FROM auth.users u
                JOIN auth.roles r ON r.id = u.role_id
                WHERE u.id = :livreur_id
                AND r.nom = 'LIVREUR'
                  AND u.is_active = TRUE
                  AND u.disponible = TRUE
                  AND u.peut_transport = TRUE
                  AND LOWER(TRIM(u.ville_actuelle)) =
                      LOWER(TRIM(:ville_depart))
                  AND NOT EXISTS (
                      SELECT 1
                      FROM livraison.livraisons l
                      WHERE l.livreur_id = u.id
                        AND l.etat_livraison::text
                            IN ('EN_ATTENTE', 'EN_TRANSIT')
                  )
                FOR UPDATE OF u
            """),
            {
                "livreur_id": affectation.livreur_id,
                "ville_depart": agence["ville"],
            },
        ).first()

        if livreur is None:
            raise HTTPException(
                status_code=409,
                detail="Livreur indisponible ou non eligible au transport inter-agences",
            )

        # 3. Lock and verify all selected parcels
        query_colis = text("""
            SELECT
                c.id,
                c.agence_destination_id
            FROM colis.colis c
            WHERE c.id IN :colis_ids
              AND c.agence_actuelle_id = :agence_id
              AND c.agence_destination_id IS NOT NULL
              AND c.agence_destination_id <> c.agence_actuelle_id
            FOR UPDATE
        """).bindparams(bindparam("colis_ids", expanding=True))

        colis_rows = db.execute(
            query_colis,
            {
                "colis_ids": colis_ids,
                "agence_id": agence_id,
            },
        ).mappings().all()

        if len(colis_rows) != len(colis_ids):
            raise HTTPException(
                status_code=409,
                detail="Certains colis ne sont pas disponibles dans votre agence pour le transport",
            )

        destinations = {row["agence_destination_id"] for row in colis_rows}

        if len(destinations) != 1:
            raise HTTPException(
                status_code=400,
                detail="Tous les colis doivent avoir la meme agence de destination",
            )

        agence_arrivee_id = next(iter(destinations))

        destination = db.execute(
            text("""
                SELECT id, ville
                FROM agence.agences
                WHERE id = :agence_id
                  AND is_active = TRUE
            """),
            {"agence_id": agence_arrivee_id},
        ).mappings().first()

        if destination is None:
            raise HTTPException(status_code=404, detail="Agence de destination introuvable ou inactive")

        # 4. Create mission
        mission_id = uuid4()

        db.execute(
            text("""
                INSERT INTO livraison.livraisons (
                    id,
                    livreur_id,
                    agence_depart_id,
                    agence_arrivee_id,
                    ville_depart,
                    ville_arrivee,
                    etat_livraison,
                    type_mission
                )
                VALUES (
                    :id,
                    :livreur_id,
                    :agence_depart_id,
                    :agence_arrivee_id,
                    :ville_depart,
                    :ville_arrivee,
                    CAST('EN_ATTENTE' AS livraison.etat_livraison),
                    'TRANSPORT_INTER_AGENCES'
                )
            """),
            {
                "id": mission_id,
                "livreur_id": affectation.livreur_id,
                "agence_depart_id": agence_id,
                "agence_arrivee_id": agence_arrivee_id,
                "ville_depart": agence["ville"],
                "ville_arrivee": destination["ville"],
            },
        )

        # 5. Link all parcels to the mission
        db.execute(
            text("""
                INSERT INTO livraison.livraison_colis (
                    livraison_id,
                    colis_id
                )
                SELECT :livraison_id, unnest(CAST(:colis_ids AS uuid[]))
            """),
            {
                "livraison_id": mission_id,
                "colis_ids": colis_ids,
            },
        )

        # 5. Rendre le transporteur indisponible pendant la mission
        resultat = db.execute(
            text("""
                UPDATE auth.users
                SET disponible = FALSE
                WHERE id = :livreur_id
                  AND disponible = TRUE
            """),
            {"livreur_id": affectation.livreur_id},
        )

        if resultat.rowcount != 1:
            raise HTTPException(
                status_code=409,
                detail="Le transporteur n'est plus disponible pour ce trajet",
            )

        db.commit()

        notifier_livreur_affectation(
            livreur_id=affectation.livreur_id,
            livraison_id=mission_id,
            title="Nouvelle mission de livraison",
            message=(
                f"Une nouvelle mission de livraison client "
                f"vous a ete affectee a {agence['ville']}."
            ),
        )

        return {
            "message": "Mission de livraison client creee avec succes",
            "livraison_id": str(mission_id),
            "livreur_id": str(affectation.livreur_id),
            "agence_id": str(agence_id),
            "nombre_colis": len(colis_ids),
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

# CREATE MULTI-STOP INTER-AGENCY TRANSPORT
@router.post("/affectation-multi-etapes", status_code=201)
def creer_mission_multi_etapes(
    affectation: LivraisonMultiEtapesCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_admin_id = current_user["agence_id"]

    if not agence_admin_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee a cet administrateur",
        )

    agence_ids = affectation.agence_ids

    if len(agence_ids) < 2 or len(agence_ids) != len(set(agence_ids)):
        raise HTTPException(
            status_code=400,
            detail="Le trajet doit contenir au moins deux agences distinctes",
        )

    try:
        # 1. Vérifier les agences du trajet
        query_agences = text("""
            SELECT id, ville
            FROM agence.agences
            WHERE id IN :agence_ids
              AND is_active = TRUE
        """).bindparams(bindparam("agence_ids", expanding=True))

        agences_rows = db.execute(
            query_agences,
            {"agence_ids": agence_ids},
        ).mappings().all()

        agences = {row["id"]: row for row in agences_rows}

        if len(agences) != len(agence_ids):
            raise HTTPException(
                status_code=404,
                detail="Une ou plusieurs agences sont introuvables ou inactives",
            )

        agence_depart = agences[agence_ids[0]]
        agence_arrivee = agences[agence_ids[-1]]

        # Le trajet doit commencer dans l'agence de l'administrateur
        if agence_ids[0] != agence_admin_id:
            raise HTTPException(
                status_code=403,
                detail="Le trajet doit commencer depuis votre agence",
            )

        # 2. Vérifier le transporteur
        livreur = db.execute(
            text("""
                SELECT u.id
                FROM auth.users u
                JOIN auth.roles r ON r.id = u.role_id
                WHERE u.id = :livreur_id
                  AND r.nom = 'LIVREUR'
                  AND u.is_active = TRUE
                  AND u.disponible = TRUE
                  AND u.peut_transport = TRUE
                  AND LOWER(TRIM(u.ville_actuelle)) =
                      LOWER(TRIM(:ville_depart))
                  AND NOT EXISTS (
                      SELECT 1
                      FROM livraison.livraisons l
                      WHERE l.livreur_id = u.id
                        AND l.etat_livraison::text
                            IN ('EN_ATTENTE', 'EN_TRANSIT')
                  )
                FOR UPDATE OF u
            """),
            {
                "livreur_id": affectation.livreur_id,
                "ville_depart": agence_depart["ville"],
            },
        ).first()

        if livreur is None:
            raise HTTPException(
                status_code=409,
                detail="Transporteur indisponible ou non eligible pour ce trajet",
            )

        # 3. Créer la mission
        mission_id = uuid4()

        db.execute(
            text("""
                INSERT INTO livraison.livraisons (
                    id,
                    livreur_id,
                    agence_depart_id,
                    agence_arrivee_id,
                    ville_depart,
                    ville_arrivee,
                    etat_livraison,
                    type_mission
                )
                VALUES (
                    :id,
                    :livreur_id,
                    :agence_depart_id,
                    :agence_arrivee_id,
                    :ville_depart,
                    :ville_arrivee,
                    CAST('EN_ATTENTE' AS livraison.etat_livraison),
                    'TRANSPORT_INTER_AGENCES'
                )
            """),
            {
                "id": mission_id,
                "livreur_id": affectation.livreur_id,
                "agence_depart_id": agence_ids[0],
                "agence_arrivee_id": agence_ids[-1],
                "ville_depart": agence_depart["ville"],
                "ville_arrivee": agence_arrivee["ville"],
            },
        )

        # 4. Enregistrer les étapes dans l'ordre du trajet
        for ordre, agence_id in enumerate(agence_ids):
            db.execute(
                text("""
                    INSERT INTO livraison.etapes_trajet (
                        livraison_id,
                        agence_id,
                        ordre,
                        etat
                    )
                    VALUES (
                        :livraison_id,
                        :agence_id,
                        :ordre,
                        :etat
                    )
                """),
                {
                    "livraison_id": mission_id,
                    "agence_id": agence_id,
                    "ordre": ordre,
                    "etat": "EN_COURS" if ordre == 0 else "EN_ATTENTE",
                },
            )
        # Rendre le transporteur indisponible pendant le trajet
        resultat = db.execute(
            text("""
                UPDATE auth.users
                SET disponible = FALSE
                WHERE id = :livreur_id
                  AND disponible = TRUE
            """),
            {"livreur_id": affectation.livreur_id},
        )

        if resultat.rowcount != 1:
            raise HTTPException(
                status_code=409,
                detail="Le transporteur n'est plus disponible pour ce trajet",
            )
        db.commit()

        notifier_livreur_affectation(
            livreur_id=affectation.livreur_id,
            livraison_id=mission_id,
            title="Nouvelle mission de transport",
            message=(
                f"Un nouveau trajet de transport inter-agences "
                f"vous a ete affecte : {agence_depart['ville']} "
                f"vers {agence_arrivee['ville']}."
            ),
        )

        return {
            "message": "Mission multi-etapes creee avec succes",
            "livraison_id": str(mission_id),
            "livreur_id": str(affectation.livreur_id),
            "nombre_etapes": len(agence_ids),
            "trajet": [
                {
                    "ordre": ordre,
                    "agence_id": str(agence_id),
                    "ville": agences[agence_id]["ville"],
                }
                for ordre, agence_id in enumerate(agence_ids)
            ],
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logging.exception("Erreur lors de la creation de la mission multi-etapes")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors de la creation de la mission multi-etapes",
        )

# ADD PARCELS TO THE ACTIVE STOP OF A MULTI-STOP MISSION
@router.post("/{livraison_id}/etapes/colis", status_code=201)
def ajouter_colis_etape(
    livraison_id: UUID,
    affectation: AjouterColisEtapeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee a cet administrateur",
        )

    colis_ids = affectation.colis_ids

    if not colis_ids or len(colis_ids) != len(set(colis_ids)):
        raise HTTPException(
            status_code=400,
            detail="Liste de colis invalide ou doublons",
        )

    try:
        # 1. Verifier la mission
        mission = db.execute(
            text("""
                SELECT id, etat_livraison::text AS etat_livraison,
                       type_mission
                FROM livraison.livraisons
                WHERE id = :livraison_id
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if mission is None:
            raise HTTPException(
                status_code=404,
                detail="Mission introuvable",
            )

        if mission["type_mission"] != "TRANSPORT_INTER_AGENCES":
            raise HTTPException(
                status_code=400,
                detail="Cette mission n'est pas un transport inter-agences",
            )

        if mission["etat_livraison"] not in ("EN_ATTENTE", "EN_TRANSIT"):
            raise HTTPException(
                status_code=409,
                detail="Cette mission n'est plus active",
            )

        # 2. Verifier que l'agence de l'admin est l'etape active
        etape = db.execute(
            text("""
                SELECT id, ordre, etat
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND agence_id = :agence_id
            """),
            {
                "livraison_id": livraison_id,
                "agence_id": agence_id,
            },
        ).mappings().first()

        if etape is None:
            raise HTTPException(
                status_code=403,
                detail="Votre agence ne fait pas partie de ce trajet",
            )


        if etape["etat"] not in ("EN_COURS", "ARRIVEE", "CONFIRMEE"):
            raise HTTPException(
                status_code=409,
                detail="Votre agence n'est pas l'etape active ou arrivee du trajet",
            )


        # 3. Recuperer les agences situees apres l'agence actuelle
        destinations = db.execute(
            text("""
                SELECT agence_id, ordre
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND ordre > :ordre_actuel
                ORDER BY ordre
            """),
            {
                "livraison_id": livraison_id,
                "ordre_actuel": etape["ordre"],
            },
        ).mappings().all()

        destination_orders = {
            row["agence_id"]: row["ordre"]
            for row in destinations
        }

        if not destination_orders:
            raise HTTPException(
                status_code=409,
                detail="Aucune etape suivante dans ce trajet",
            )

        # 4. Verifier et verrouiller les colis de cette agence
        query_colis = text("""
            SELECT
                c.id,
                c.agence_destination_id
            FROM colis.colis c
            WHERE c.id IN :colis_ids
              AND c.agence_actuelle_id = :agence_id
              AND c.agence_destination_id IS NOT NULL
              AND c.agence_destination_id <> :agence_id
              AND NOT EXISTS (
                  SELECT 1
                  FROM livraison.livraison_colis lc
                  JOIN livraison.livraisons l
                    ON l.id = lc.livraison_id
                  WHERE lc.colis_id = c.id
                    AND l.etat_livraison::text
                        IN ('EN_ATTENTE', 'EN_TRANSIT')
              )
            FOR UPDATE OF c
        """).bindparams(
            bindparam("colis_ids", expanding=True)
        )

        colis_rows = db.execute(
            query_colis,
            {
                "colis_ids": colis_ids,
                "agence_id": agence_id,
            },
        ).mappings().all()

        if len(colis_rows) != len(colis_ids):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Certains colis sont indisponibles dans votre agence "
                    "ou deja affectes a une mission active"
                ),
            )

        # 5. Verifier que chaque destination est une etape ulterieure
        for colis in colis_rows:
            if colis["agence_destination_id"] not in destination_orders:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "La destination d'un ou plusieurs colis "
                        "n'est pas une etape ulterieure de ce trajet"
                    ),
                )

        # 6. Ajouter les colis avec leurs agences de chargement/dechargement
        insert_colis = text("""
            INSERT INTO livraison.livraison_colis (
                livraison_id,
                colis_id,
                agence_chargement_id,
                agence_dechargement_id
            )
            VALUES (
                :livraison_id,
                :colis_id,
                :agence_chargement_id,
                :agence_dechargement_id
            )
        """)

        db.execute(
            insert_colis,
            [
                {
                    "livraison_id": livraison_id,
                    "colis_id": colis["id"],
                    "agence_chargement_id": agence_id,
                    "agence_dechargement_id": colis["agence_destination_id"],
                }
                for colis in colis_rows
            ],
        )

        db.commit()

        return {
            "message": "Colis ajoutes au trajet avec succes",
            "livraison_id": str(livraison_id),
            "agence_chargement_id": str(agence_id),
            "nombre_colis": len(colis_rows),
            "colis": [
                {
                    "colis_id": str(colis["id"]),
                    "agence_dechargement_id": str(
                        colis["agence_destination_id"]
                    ),
                }
                for colis in colis_rows
            ],
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logging.exception("Erreur lors de l'ajout des colis a l'etape")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors de l'ajout des colis au trajet",
        )

# DEMARRER UN TRAJET MULTI-ETAPES
@router.post("/{livraison_id}/demarrer")
def demarrer_trajet_multi_etapes(
    livraison_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_livreur),
):
    try:
        # 1. Verifier que la mission existe et appartient au transporteur
        mission = db.execute(
            text("""
                SELECT id, livreur_id, type_mission, etat_livraison
                FROM livraison.livraisons
                WHERE id = :livraison_id
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if not mission:
            raise HTTPException(status_code=404, detail="Mission introuvable")

        if str(mission["livreur_id"]) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Vous n'etes pas le transporteur de cette mission",
            )

        if mission["type_mission"] != "TRANSPORT_INTER_AGENCES":
            raise HTTPException(
                status_code=400,
                detail="Cette mission n'est pas un transport inter-agences",
            )

        if mission["etat_livraison"] != "EN_ATTENTE":
            raise HTTPException(
                status_code=409,
                detail="Cette mission a deja ete demarree ou terminee",
            )

        # 2. Verifier la premiere etape
        premiere_etape = db.execute(
            text("""
                SELECT id, agence_id, etat
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND ordre = 0
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if not premiere_etape or premiere_etape["etat"] != "EN_COURS":
            raise HTTPException(
                status_code=409,
                detail="La premiere etape n'est pas prete",
            )

        # 3. Recuperer la deuxieme etape
        deuxieme_etape = db.execute(
            text("""
                SELECT id
                FROM livraison.etapes_trajet
                WHERE livraison_id = :livraison_id
                  AND ordre = 1
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if not deuxieme_etape:
            raise HTTPException(
                status_code=409,
                detail="La deuxieme etape est introuvable",
            )

        # 4. Confirmer le depart de l'agence d'origine
        db.execute(
            text("""
                UPDATE livraison.etapes_trajet
                SET etat = 'CONFIRMEE',
                    date_confirmation = NOW()
                WHERE id = :etape_id
            """),
            {"etape_id": premiere_etape["id"]},
        )

        # 5. Activer la deuxieme agence
        db.execute(
            text("""
                UPDATE livraison.etapes_trajet
                SET etat = 'EN_COURS'
                WHERE id = :etape_id
            """),
            {"etape_id": deuxieme_etape["id"]},
        )


        # 6. Demarrer la mission
        db.execute(
            text("""
                UPDATE livraison.livraisons
                SET etat_livraison = 'EN_TRANSIT',
                    date_depart = NOW()
                WHERE id = :livraison_id
            """),
            {"livraison_id": livraison_id},
        )

        # 7. Recuperer les colis transportes sur la premiere etape
        colis_transportes = db.execute(
            text("""
                SELECT DISTINCT lc.colis_id
                FROM livraison.livraison_colis lc
                JOIN livraison.etapes_trajet ec
                    ON ec.livraison_id = lc.livraison_id
                   AND ec.agence_id = lc.agence_chargement_id
                JOIN livraison.etapes_trajet ed
                    ON ed.livraison_id = lc.livraison_id
                   AND ed.agence_id = lc.agence_dechargement_id
                WHERE lc.livraison_id = :livraison_id
                  AND ec.ordre <= 0
                  AND ed.ordre > 0
            """),
            {"livraison_id": livraison_id},
        ).scalars().all()

        # 8. Enregistrer automatiquement PRIS_EN_CHARGE
        if colis_transportes:
            statut_service_url = os.getenv("STATUT_SERVICE_URL")
            internal_api_key = os.getenv("INTERNAL_API_KEY")

            if not statut_service_url or not internal_api_key:
                raise HTTPException(
                    status_code=500,
                    detail="Configuration du service statut manquante",
                )

            try:
                response = httpx.post(
                    f"{statut_service_url}/api/v1/statuts/internal/prise-en-charge",
                    headers={
                        "X-Internal-API-Key": internal_api_key,
                    },
                    json={
                        "colis_ids": [
                            str(colis_id)
                            for colis_id in colis_transportes
                        ],
                        "utilisateur_id": str(current_user.id),
                        "commentaire": "Depart du trajet inter-agences",
                    },
                    timeout=15,
                )
                response.raise_for_status()

            except httpx.HTTPError:
                logging.exception(
                    "Erreur lors de l'enregistrement des statuts PRIS_EN_CHARGE"
                )
                raise HTTPException(
                    status_code=502,
                    detail="Impossible d'enregistrer les statuts des colis",
                )

        db.commit()


        return {
            "message": "Trajet demarre avec succes",
            "livraison_id": str(livraison_id),
            "premiere_etape": "CONFIRMEE",
            "prochaine_etape": "EN_COURS",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logging.exception("Erreur lors du demarrage du trajet multi-etapes")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors du demarrage du trajet",
        )

# DECLARER L'ARRIVEE DU TRANSPORTEUR A UNE ETAPE
@router.post("/{livraison_id}/etapes/{agence_id}/arrivee")
def declarer_arrivee_etape(
    livraison_id: UUID,
    agence_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_livreur),
):
    try:
        # 1. Verifier la mission et le transporteur
        mission = db.execute(
            text("""
                SELECT id, livreur_id, type_mission, etat_livraison
                FROM livraison.livraisons
                WHERE id = :livraison_id
                FOR UPDATE
            """),
            {"livraison_id": livraison_id},
        ).mappings().first()

        if not mission:
            raise HTTPException(status_code=404, detail="Mission introuvable")

        if str(mission["livreur_id"]) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Vous n'etes pas le transporteur de cette mission",
            )

        if mission["type_mission"] != "TRANSPORT_INTER_AGENCES":
            raise HTTPException(
                status_code=400,
                detail="Cette mission n'est pas un transport inter-agences",
            )

        if mission["etat_livraison"] != "EN_TRANSIT":
            raise HTTPException(
                status_code=409,
                detail="La mission n'est pas en cours de transport",
            )

        # 2. Verifier l'etape concernee
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

        if not etape:
            raise HTTPException(
                status_code=404,
                detail="Cette agence ne fait pas partie du trajet",
            )

        if etape["ordre"] == 0:
            raise HTTPException(
                status_code=409,
                detail="Cette agence est le point de depart",
            )

        if etape["etat"] != "EN_COURS":
            raise HTTPException(
                status_code=409,
                detail="Cette etape n'est pas l'etape active du trajet",
            )

        # 3. Enregistrer l'arrivee
        db.execute(
            text("""
                UPDATE livraison.etapes_trajet
                SET etat = 'ARRIVEE',
                    date_arrivee_reelle = NOW()
                WHERE id = :etape_id
            """),
            {"etape_id": etape["id"]},
        )

        db.commit()
        # 4. Notifier l'administrateur de l'agence d'arrivee
        admin = db.execute(
            text("""
                SELECT u.id
                FROM auth.users u
                JOIN auth.roles r ON r.id = u.role_id
                WHERE r.nom = 'ADMIN'
                  AND u.agence_id = :agence_id
                  AND u.is_active = TRUE
                LIMIT 1
            """),
            {"agence_id": agence_id},
        ).mappings().first()

        if admin:
            notifier_admin_arrivee(
                admin_id=admin["id"],
                agence_id=agence_id,
                livraison_id=livraison_id,
            )
        else:
            logger.warning(
                "Aucun administrateur actif pour l'agence %s",
                agence_id,
            )
        return {
            "message": "Arrivee enregistree avec succes",
            "livraison_id": str(livraison_id),
            "agence_id": str(agence_id),
            "etape": "ARRIVEE",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logging.exception("Erreur lors de l'enregistrement de l'arrivee")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors de l'enregistrement de l'arrivee",
        )



# GET COURIERS ELIGIBLE FOR FINAL CLIENT DELIVERY
@router.get("/livreurs-livraison-client")
def get_livreurs_livraison_client(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    agence = db.execute(
        text("""
            SELECT id, ville
            FROM agence.agences
            WHERE id = :agence_id
              AND is_active = TRUE
        """),
        {"agence_id": agence_id},
    ).mappings().first()

    if agence is None:
        raise HTTPException(
            status_code=404,
            detail="Agence introuvable ou inactive",
        )

    rows = db.execute(
        text("""
            SELECT
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                u.ville_actuelle,
                u.disponible
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            WHERE r.nom = 'LIVREUR'
              AND u.is_active = TRUE
              AND u.disponible = TRUE
              AND u.peut_livrer_client = TRUE
              AND LOWER(TRIM(u.ville_actuelle)) =
                  LOWER(TRIM(:ville))
              AND NOT EXISTS (
                  SELECT 1
                  FROM livraison.livraisons l
                  WHERE l.livreur_id = u.id
                    AND l.etat_livraison::text
                        IN ('EN_ATTENTE', 'EN_TRANSIT')
              )
            ORDER BY u.nom, u.prenom
        """),
        {"ville": agence["ville"]},
    ).mappings().all()

    return [dict(row) for row in rows]


# ASSIGN PARCELS TO A LOCAL COURIER FOR FINAL CLIENT DELIVERY
@router.post("/affectation-livraison-client", status_code=201)
def affecter_colis_livraison_client(
    affectation: LivraisonAffectationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Acces reserve aux administrateurs d'agence",
        )

    agence_id = current_user["agence_id"]

    if not agence_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associee",
        )

    colis_ids = affectation.colis_ids

    if not colis_ids or len(colis_ids) != len(set(colis_ids)):
        raise HTTPException(
            status_code=400,
            detail="Liste de colis invalide ou doublons",
        )

    try:
        # 1. Verify the arrival agency
        agence = db.execute(
            text("""
                SELECT id, ville
                FROM agence.agences
                WHERE id = :agence_id
                  AND is_active = TRUE
            """),
            {"agence_id": agence_id},
        ).mappings().first()

        if agence is None:
            raise HTTPException(
                status_code=404,
                detail="Agence introuvable ou inactive",
            )

        # 2. Verify and lock the local courier
        livreur = db.execute(
            text("""
                SELECT u.id
                FROM auth.users u
                JOIN auth.roles r ON r.id = u.role_id
                WHERE u.id = :livreur_id
                  AND r.nom = 'LIVREUR'
                  AND u.is_active = TRUE
                  AND u.disponible = TRUE
                  AND u.peut_livrer_client = TRUE
                  AND LOWER(TRIM(u.ville_actuelle)) =
                      LOWER(TRIM(:ville))
                  AND NOT EXISTS (
                      SELECT 1
                      FROM livraison.livraisons l
                      WHERE l.livreur_id = u.id
                        AND l.etat_livraison::text
                            IN ('EN_ATTENTE', 'EN_TRANSIT')
                  )
                FOR UPDATE OF u
            """),
            {
                "livreur_id": affectation.livreur_id,
                "ville": agence["ville"],
            },
        ).first()

        if livreur is None:
            raise HTTPException(
                status_code=409,
                detail="Livreur indisponible ou non eligible a la livraison client",
            )

        # 3. Verify that every parcel is physically at this agency
        query_colis = text("""
            SELECT
                c.id,
                c.agence_actuelle_id,
                c.agence_destination_id
            FROM colis.colis c
            WHERE c.id IN :colis_ids
              AND c.agence_actuelle_id = :agence_id
              AND c.agence_destination_id = :agence_id
            FOR UPDATE
        """).bindparams(
            bindparam("colis_ids", expanding=True)
        )

        colis_rows = db.execute(
            query_colis,
            {
                "colis_ids": colis_ids,
                "agence_id": agence_id,
            },
        ).mappings().all()

        if len(colis_rows) != len(colis_ids):
            raise HTTPException(
                status_code=409,
                detail="Certains colis ne sont pas encore dans votre agence de destination",
            )

        # 4. Verify the latest parcel status
        query_statuts = text("""
            SELECT DISTINCT ON (hs.colis_id)
                hs.colis_id,
                s.code
            FROM statut.historique_statuts hs
            JOIN statut.statuts s ON s.id = hs.statut_id
            WHERE hs.colis_id IN :colis_ids
            ORDER BY
                hs.colis_id,
                hs.date_changement DESC,
                hs.id DESC
        """).bindparams(
            bindparam("colis_ids", expanding=True)
        )

        statuts_rows = db.execute(
            query_statuts,
            {"colis_ids": colis_ids},
        ).mappings().all()

        statuts_par_colis = {
            row["colis_id"]: row["code"]
            for row in statuts_rows
        }

        if (
            len(statuts_par_colis) != len(colis_ids)
            or any(
                statuts_par_colis.get(colis_id)
                != "ARRIVEE_A_L_AGENCE"
                for colis_id in colis_ids
            )
        ):
            raise HTTPException(
                status_code=409,
                detail="Tous les colis doivent avoir le statut ARRIVEE_A_L_AGENCE",
            )

        # 5. Prevent assigning a parcel already in another active mission
        query_missions = text("""
            SELECT COUNT(*)
            FROM livraison.livraison_colis lc
            JOIN livraison.livraisons l
              ON l.id = lc.livraison_id
            WHERE lc.colis_id IN :colis_ids
              AND l.etat_livraison::text
                  IN ('EN_ATTENTE', 'EN_TRANSIT')
        """).bindparams(
            bindparam("colis_ids", expanding=True)
        )

        missions_actives = db.execute(
            query_missions,
            {"colis_ids": colis_ids},
        ).scalar()

        if missions_actives:
            raise HTTPException(
                status_code=409,
                detail="Certains colis sont deja affectes a une mission active",
            )

        # 6. Create the final client delivery mission
        mission_id = uuid4()

        db.execute(
            text("""
                INSERT INTO livraison.livraisons (
                    id,
                    livreur_id,
                    agence_depart_id,
                    agence_arrivee_id,
                    ville_depart,
                    ville_arrivee,
                    etat_livraison,
                    type_mission
                )
                VALUES (
                    :id,
                    :livreur_id,
                    :agence_id,
                    :agence_id,
                    :ville,
                    :ville,
                    CAST('EN_ATTENTE' AS livraison.etat_livraison),
                    'LIVRAISON_CLIENT'
                )
            """),
            {
                "id": mission_id,
                "livreur_id": affectation.livreur_id,
                "agence_id": agence_id,
                "ville": agence["ville"],
            },
        )

        # 7. Link all parcels to this mission
        db.execute(
            text("""
                INSERT INTO livraison.livraison_colis (
                    livraison_id,
                    colis_id
                )
                SELECT :livraison_id, unnest(CAST(:colis_ids AS uuid[]))
            """),
            {
                "livraison_id": mission_id,
                "colis_ids": colis_ids,
            },
        )

        db.commit()

        notifier_livreur_affectation(
            livreur_id=affectation.livreur_id,
            livraison_id=mission_id,
            title="Nouvelle livraison client",
            message=(
                f"Une nouvelle livraison client "
                f"vous a ete affectee a {agence['ville']}."
            ),
        )

        return {
            "message": "Mission de livraison client creee avec succes",
            "livraison_id": str(mission_id),
            "livreur_id": str(affectation.livreur_id),
            "agence_id": str(agence_id),
            "nombre_colis": len(colis_ids),
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
