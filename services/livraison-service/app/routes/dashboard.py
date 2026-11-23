
from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_admin


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


STATUS_MAP = {
    "CREE": "pending",
    "EN_ATTENTE": "pending",
    "PRIS_EN_CHARGE": "shipped",
    "EN_COURS": "out_for_delivery",
    "LIVRE": "delivered",
    "ECHEC": "failed",
    "NOUVELLE_TENTATIVE": "pending",
}


@router.get("/super-admin")
def get_super_admin_dashboard(
    days: int = Query(default=30, ge=7, le=90),
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if current_user["role"] != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé au Super Administrateur",
        )

    now = datetime.now().astimezone()
    start_date = now - timedelta(days=days)

    # Dernier statut connu de chaque colis
    latest_status = """
        SELECT DISTINCT ON (h.colis_id)
            h.colis_id,
            s.code,
            h.date_changement,
            h.utilisateur_id
        FROM statut.historique_statuts h
        JOIN statut.statuts s ON s.id = h.statut_id
        ORDER BY h.colis_id, h.date_changement DESC, h.id DESC
    """

    # Statistiques globales des colis
    stats_row = db.execute(
        text(f"""
            WITH latest AS ({latest_status})
            SELECT
                COUNT(c.id) AS total,
                COUNT(c.id) FILTER (
                    WHERE c.date_enregistrement::date = CURRENT_DATE
                ) AS today,
                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'LIVRE'
                ) AS delivered,
                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'ECHEC'
                ) AS failed,
                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') IN (
                        'PRIS_EN_CHARGE', 'EN_COURS'
                    )
                ) AS in_transit,
                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'EN_ATTENTE'
                ) AS pending,
                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'EN_COURS'
                ) AS ongoing
            FROM colis.colis c
            LEFT JOIN latest l ON l.colis_id = c.id
        """)
    ).mappings().one()

    by_status = {
        "pending": 0,
        "shipped": 0,
        "in_transit": 0,
        "arrived": 0,
        "assigned": 0,
        "out_for_delivery": 0,
        "delivered": 0,
        "failed": 0,
        "cancelled": 0,
    }

    status_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status})
            SELECT COALESCE(l.code, 'CREE') AS code, COUNT(*) AS total
            FROM colis.colis c
            LEFT JOIN latest l ON l.colis_id = c.id
            GROUP BY COALESCE(l.code, 'CREE')
        """)
    ).mappings().all()

    for row in status_rows:
        key = STATUS_MAP.get(row["code"])
        if key:
            by_status[key] += row["total"]

    # Nombre total de livraisons
    delivery_row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE etat_livraison IN ('EN_TRANSIT', 'ARRIVEE_A_L_AGENCE')
                ) AS ongoing,
                COUNT(*) FILTER (
                    WHERE date_arrivee_prevue < NOW()
                      AND date_arrivee_reelle IS NULL
                      AND etat_livraison <> 'LIVREE'
                ) AS late
            FROM livraison.livraisons
        """)
    ).mappings().one()

    delivered = stats_row["delivered"]
    failed = stats_row["failed"]
    denominator = delivered + failed
    success_rate = (delivered / denominator * 100) if denominator else 0

    stats = {
        "total": stats_row["total"],
        "today": stats_row["today"],
        "byStatus": by_status,
        "pending": stats_row["pending"],
        "inTransit": stats_row["in_transit"],
        "arrived": by_status["arrived"],
        "ongoing": delivery_row["ongoing"],
        "delivered": delivered,
        "failed": failed,
        "cancelled": 0,
        "late": delivery_row["late"],
        "anomalies": failed,
        "successRate": success_rate,
        "deliveries": delivery_row["total"],
    }

    # Statistiques des agences
    agency_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status})
            SELECT
                a.id,
                a.nom_agence AS name,
                a.ville AS city,
                a.is_active AS active,
                COUNT(DISTINCT c.id) AS total,
                COUNT(DISTINCT c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'LIVRE'
                ) AS delivered,
                COUNT(DISTINCT c.id) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM livraison.livraison_colis lc
                        JOIN livraison.livraisons liv
                            ON liv.id = lc.livraison_id
                        WHERE lc.colis_id = c.id
                          AND liv.date_arrivee_prevue < NOW()
                          AND liv.date_arrivee_reelle IS NULL
                          AND liv.etat_livraison <> 'LIVREE'
                    )
                ) AS late
            FROM agence.agences a
            LEFT JOIN colis.colis c
                ON c.agence_expedition_id = a.id
            LEFT JOIN latest l ON l.colis_id = c.id
            GROUP BY a.id, a.nom_agence, a.ville, a.is_active
            ORDER BY a.nom_agence
        """)
    ).mappings().all()

    agencies = []
    for row in agency_rows:
        total = row["total"]
        delivered_count = row["delivered"]
        rate = delivered_count / total * 100 if total else 0

        agencies.append({
            "id": str(row["id"]),
            "name": row["name"],
            "city": row["city"],
            "active": row["active"],
            "total": total,
            "delivered": delivered_count,
            "late": row["late"],
            "rate": rate,
        })

    # Comptage des utilisateurs par rôle
    counts_row = db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE r.nom = 'ADMIN') AS admins,
                COUNT(*) FILTER (WHERE r.nom = 'LIVREUR') AS couriers,
                COUNT(*) AS users
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
        """)
    ).mappings().one()

    agency_counts = db.execute(
        text("""
            SELECT
                COUNT(*) AS agencies,
                COUNT(*) FILTER (WHERE is_active = TRUE) AS active_agencies
            FROM agence.agences
        """)
    ).mappings().one()

    counts = {
        "agencies": agency_counts["agencies"],
        "activeAgencies": agency_counts["active_agencies"],
        "users": counts_row["users"],
        "admins": counts_row["admins"],
        "couriers": counts_row["couriers"],
    }

    # Activité récente
    activity_rows = db.execute(
        text("""
            SELECT
                h.id,
                h.colis_id,
                c.numero_suivi,
                s.code,
                h.date_changement,
                COALESCE(u.prenom || ' ' || u.nom, 'Système') AS by
            FROM statut.historique_statuts h
            JOIN statut.statuts s ON s.id = h.statut_id
            JOIN colis.colis c ON c.id = h.colis_id
            LEFT JOIN auth.users u ON u.id = h.utilisateur_id
            ORDER BY h.date_changement DESC
            LIMIT 7
        """)
    ).mappings().all()

    activity = []
    for row in activity_rows:
        activity.append({
            "id": str(row["id"]),
            "parcelId": row["numero_suivi"],
            "parcelUuid": str(row["colis_id"]),
            "to": STATUS_MAP.get(row["code"], "pending"),
            "by": row["by"],
            "at": row["date_changement"].isoformat(),
        })

    # Série quotidienne des colis créés et livrés
    series_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status})
            SELECT
                d.day::date AS day,
                (
                    SELECT COUNT(*)
                    FROM colis.colis c
                    WHERE c.date_enregistrement::date = d.day::date
                ) AS created,
                (
                    SELECT COUNT(*)
                    FROM statut.historique_statuts h
                    JOIN statut.statuts s ON s.id = h.statut_id
                    WHERE s.code = 'LIVRE'
                      AND h.date_changement::date = d.day::date
                ) AS delivered
            FROM generate_series(
                CAST(:start_date AS date),
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS d(day)
            ORDER BY d.day
        """),
        {"start_date": start_date.date()},
    ).mappings().all()

    series = [
        {
            "label": row["day"].strftime("%d/%m"),
            "created": row["created"],
            "delivered": row["delivered"],
        }
        for row in series_rows
    ]

    return {
        "stats": stats,
        "series": series,
        "statusMix": by_status,
        "agencies": agencies,
        "counts": counts,
        "activity": activity,
    }


@router.get("/admin")
def get_admin_dashboard(
    days: int = Query(default=30, ge=7, le=90),
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé à l'Administrateur",
        )

    agency_id = current_user["agence_id"]

    if not agency_id:
        raise HTTPException(
            status_code=403,
            detail="Aucune agence associée à cet administrateur",
        )

    start_date = date.today() - timedelta(days=days - 1)

    latest_status = """
        SELECT DISTINCT ON (h.colis_id)
            h.colis_id,
            s.code,
            h.date_changement,
            h.utilisateur_id
        FROM statut.historique_statuts h
        JOIN statut.statuts s ON s.id = h.statut_id
        ORDER BY h.colis_id, h.date_changement DESC, h.id DESC
    """

    scoped_parcels = """
        SELECT c.*
        FROM colis.colis c
        WHERE c.agence_expedition_id = :agency_id
           OR EXISTS (
                SELECT 1
                FROM livraison.livraison_colis lc
                JOIN livraison.livraisons liv
                    ON liv.id = lc.livraison_id
                WHERE lc.colis_id = c.id
                  AND (
                      liv.agence_depart_id = :agency_id
                      OR liv.agence_arrivee_id = :agency_id
                  )
           )
    """

    scoped_deliveries = """
        SELECT liv.*
        FROM livraison.livraisons liv
        WHERE liv.agence_depart_id = :agency_id
           OR liv.agence_arrivee_id = :agency_id
    """

    params = {"agency_id": agency_id}

    # Statistiques des colis de l'agence
    stats_row = db.execute(
        text(f"""
            WITH latest AS ({latest_status}),
            scoped AS ({scoped_parcels})
            SELECT
                COUNT(c.id) AS total,

                COUNT(c.id) FILTER (
                    WHERE c.date_enregistrement::date = CURRENT_DATE
                ) AS today,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'LIVRE'
                ) AS delivered,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'ECHEC'
                ) AS failed,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'EN_ATTENTE'
                ) AS assigned,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'EN_COURS'
                ) AS out_for_delivery,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') IN (
                        'PRIS_EN_CHARGE'
                    )
                ) AS shipped,

                COUNT(c.id) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM livraison.livraison_colis lc
                        JOIN livraison.livraisons liv
                            ON liv.id = lc.livraison_id
                        WHERE lc.colis_id = c.id
                          AND liv.date_arrivee_prevue < NOW()
                          AND liv.date_arrivee_reelle IS NULL
                          AND liv.etat_livraison <> 'LIVREE'
                    )
                ) AS late

            FROM scoped c
            LEFT JOIN latest l ON l.colis_id = c.id
        """),
        params,
    ).mappings().one()

    # Répartition des statuts
    status_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status}),
            scoped AS ({scoped_parcels})
            SELECT
                COALESCE(l.code, 'CREE') AS code,
                COUNT(*) AS total
            FROM scoped c
            LEFT JOIN latest l ON l.colis_id = c.id
            GROUP BY COALESCE(l.code, 'CREE')
        """),
        params,
    ).mappings().all()

    by_status = {
        "pending": 0,
        "shipped": 0,
        "in_transit": 0,
        "arrived": 0,
        "assigned": 0,
        "out_for_delivery": 0,
        "delivered": 0,
        "failed": 0,
        "cancelled": 0,
    }

    for row in status_rows:
        key = STATUS_MAP.get(row["code"])
        if key:
            by_status[key] += row["total"]

    # Nombre de livraisons de l'agence
    delivery_count = db.execute(
        text(f"""
            SELECT COUNT(*) AS total
            FROM ({scoped_deliveries}) d
        """),
        params,
    ).mappings().one()["total"]

    # Nombre de colis en transit et arrivés à l'agence
    delivery_status_row = db.execute(
        text(f"""
            SELECT
                COUNT(DISTINCT lc.colis_id) FILTER (
                    WHERE d.etat_livraison = 'EN_TRANSIT'
                ) AS in_transit,

                COUNT(DISTINCT lc.colis_id) FILTER (
                    WHERE d.etat_livraison = 'ARRIVEE_A_L_AGENCE'
                ) AS arrived,
                COUNT(DISTINCT d.id) FILTER (
                    WHERE d.etat_livraison IN (
                        'EN_ATTENTE',
                        'EN_TRANSIT',
                        'ARRIVEE_A_L_AGENCE'
                    )
                ) AS ongoing
            FROM ({scoped_deliveries}) d
            JOIN livraison.livraison_colis lc
                ON lc.livraison_id = d.id
        """),
        params,
    ).mappings().one()

    delivered = stats_row["delivered"]
    failed = stats_row["failed"]
    denominator = delivered + failed

    stats = {
        "total": stats_row["total"],
        "today": stats_row["today"],
        "byStatus": by_status,
        "pending": by_status["pending"],
        "inTransit": delivery_status_row["in_transit"],
        "arrived": delivery_status_row["arrived"],
        "ongoing": delivery_status_row["ongoing"],
        "delivered": delivered,
        "failed": failed,
        "cancelled": by_status["cancelled"],
        "late": stats_row["late"],
        "anomalies": failed + stats_row["late"],
        "successRate": (
            delivered / denominator * 100 if denominator else 100
        ),
        "deliveries": delivery_count,
    }

    # Livreurs de l'agence et leurs statistiques
    courier_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status}),
            scoped_deliveries AS ({scoped_deliveries})
            SELECT
                u.id,
                u.prenom || ' ' || u.nom AS name,
                u.disponible,
                u.is_active,

                COUNT(DISTINCT liv.id) FILTER (
                    WHERE liv.etat_livraison = 'LIVREE'
                ) AS done,

                COUNT(DISTINCT liv.id) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM livraison.livraison_colis lc
                        JOIN latest ls ON ls.colis_id = lc.colis_id
                        WHERE lc.livraison_id = liv.id
                          AND ls.code = 'ECHEC'
                    )
                ) AS failed,

                COUNT(DISTINCT liv.id) FILTER (
                    WHERE liv.etat_livraison IN (
                        'EN_ATTENTE',
                        'EN_TRANSIT',
                        'ARRIVEE_A_L_AGENCE'
                    )
                ) AS ongoing

            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            LEFT JOIN scoped_deliveries liv
                ON liv.livreur_id = u.id
            WHERE r.nom = 'LIVREUR'
              AND u.agence_id = :agency_id
            GROUP BY u.id, u.prenom, u.nom, u.disponible, u.is_active
            ORDER BY u.prenom, u.nom
        """),
        params,
    ).mappings().all()

    couriers = []

    for row in courier_rows:
        done = row["done"]
        courier_failed = row["failed"]
        total_resolved = done + courier_failed

        couriers.append({
            "id": str(row["id"]),
            "name": row["name"],
            "done": done,
            "failed": courier_failed,
            "ongoing": row["ongoing"],
            "rate": (
                done / total_resolved * 100
                if total_resolved else 100
            ),
            "available": row["disponible"],
            "active": row["is_active"],
        })

    availability = {
        "available": sum(
            1 for c in courier_rows
            if c["disponible"] and c["is_active"]
        ),
        "total": len(courier_rows),
    }

    # Derniers colis
    parcel_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status}),
            scoped AS ({scoped_parcels})
            SELECT
                c.id AS id,
                c.numero_suivi,
                c.expediteur_ville,
                c.destinataire_ville,
                c.date_enregistrement,
                COALESCE(l.code, 'CREE') AS code,

                EXISTS (
                    SELECT 1
                    FROM livraison.livraison_colis lc
                    JOIN livraison.livraisons liv
                        ON liv.id = lc.livraison_id
                    WHERE lc.colis_id = c.id
                      AND liv.date_arrivee_prevue < NOW()
                      AND liv.date_arrivee_reelle IS NULL
                      AND liv.etat_livraison <> 'LIVREE'
                ) AS late

            FROM scoped c
            LEFT JOIN latest l ON l.colis_id = c.id
            ORDER BY c.date_enregistrement DESC
            LIMIT 6
        """),
        params,
    ).mappings().all()

    latest_parcels = []

    for row in parcel_rows:
        latest_parcels.append({
            "id": str(row["id"]),
            "trackingNumber": row["numero_suivi"],
            "fromCity": row["expediteur_ville"],
            "toCity": row["destinataire_ville"],
            "createdAt": row["date_enregistrement"].isoformat(),
            "status": STATUS_MAP.get(row["code"], "pending"),
            "late": row["late"],
        })

    # Dernières livraisons
    delivery_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status}),
            scoped AS ({scoped_deliveries})
            SELECT
                liv.id,
                liv.etat_livraison,
                liv.created_at,
                COALESCE(u.prenom || ' ' || u.nom, 'Non affecté')
                    AS courier_name,

                (
                    SELECT c.numero_suivi
                    FROM livraison.livraison_colis lc
                    JOIN colis.colis c ON c.id = lc.colis_id
                    WHERE lc.livraison_id = liv.id
                    ORDER BY lc.ordre_livraison
                    LIMIT 1
                ) AS parcel_number,

                EXISTS (
                    SELECT 1
                    FROM livraison.livraison_colis lc
                    JOIN latest ls ON ls.colis_id = lc.colis_id
                    WHERE lc.livraison_id = liv.id
                      AND ls.code = 'ECHEC'
                ) AS has_failed_parcel

            FROM scoped liv
            LEFT JOIN auth.users u ON u.id = liv.livreur_id
            ORDER BY liv.created_at DESC
            LIMIT 5
        """),
        params,
    ).mappings().all()

    latest_deliveries = []

    for row in delivery_rows:
        if row["has_failed_parcel"]:
            delivery_status = "failed"
        elif row["etat_livraison"] == "LIVREE":
            delivery_status = "delivered"
        elif row["etat_livraison"] == "EN_TRANSIT":
            delivery_status = "out_for_delivery"
        else:
            delivery_status = "assigned"

        latest_deliveries.append({
            "id": str(row["id"]),
            "parcelId": row["parcel_number"] or "—",
            "courierName": row["courier_name"],
            "status": delivery_status,
            "assignedAt": (
                row["created_at"].isoformat()
                if row["created_at"] else None
            ),
        })

    # Activité récente de l'agence
    activity_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status}),
            scoped AS ({scoped_parcels})
            SELECT
                h.id,
                c.id AS colis_id,
                c.numero_suivi,
                s.code,
                h.date_changement,
                COALESCE(
                    u.prenom || ' ' || u.nom,
                    'Système'
                ) AS by

            FROM statut.historique_statuts h
            JOIN statut.statuts s ON s.id = h.statut_id
            JOIN scoped c ON c.id = h.colis_id
            LEFT JOIN auth.users u ON u.id = h.utilisateur_id
            ORDER BY h.date_changement DESC
            LIMIT 8
        """),
        params,
    ).mappings().all()

    activity = [
        {
            "id": str(row["id"]),
            "parcelId": row["numero_suivi"],
            "parcelUuid": str(row["colis_id"]),
            "to": STATUS_MAP.get(row["code"], "pending"),
            "by": row["by"],
            "at": row["date_changement"].isoformat(),
        }
        for row in activity_rows
    ]

    # Graphique quotidien
    series_rows = db.execute(
        text(f"""
            WITH scoped AS ({scoped_parcels})
            SELECT
                d.day::date AS day,

                (
                    SELECT COUNT(*)
                    FROM scoped c
                    WHERE c.date_enregistrement::date = d.day::date
                ) AS created,

                (
                    SELECT COUNT(*)
                    FROM statut.historique_statuts h
                    JOIN statut.statuts s ON s.id = h.statut_id
                    JOIN scoped c ON c.id = h.colis_id
                    WHERE s.code = 'LIVRE'
                      AND h.date_changement::date = d.day::date
                ) AS delivered

            FROM generate_series(
                CAST(:start_date AS date),
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS d(day)
            ORDER BY d.day
        """),
        {
            "agency_id": agency_id,
            "start_date": start_date,
        },
    ).mappings().all()

    series = [
        {
            "label": row["day"].strftime("%d/%m"),
            "created": row["created"],
            "delivered": row["delivered"],
        }
        for row in series_rows
    ]

    return {
        "stats": stats,
        "series": series,
        "statusMix": by_status,
        "couriers": couriers,
        "activity": activity,
        "latestParcels": latest_parcels,
        "latestDeliveries": latest_deliveries,
        "availability": availability,
    }


@router.get("/history")
def get_dashboard_history(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if current_user["role"] == "ADMIN":
        agency_id = current_user["agence_id"]

        if not agency_id:
            raise HTTPException(
                status_code=403,
                detail="Aucune agence associée à cet administrateur",
            )

        scope_condition = """
            c.agence_expedition_id = :agency_id
            OR EXISTS (
                SELECT 1
                FROM livraison.livraison_colis lc
                JOIN livraison.livraisons liv
                    ON liv.id = lc.livraison_id
                WHERE lc.colis_id = c.id
                  AND (
                      liv.agence_depart_id = :agency_id
                      OR liv.agence_arrivee_id = :agency_id
                  )
            )
        """
        params = {"agency_id": agency_id}

    else:
        scope_condition = "TRUE"
        params = {}

    rows = db.execute(
        text(f"""
            WITH scoped AS (
                SELECT c.id, c.numero_suivi
                FROM colis.colis c
                WHERE {scope_condition}
            ),
            ordered_history AS (
                SELECT
                    h.id,
                    h.colis_id,
                    s.code,
                    LAG(s.code) OVER (
                        PARTITION BY h.colis_id
                        ORDER BY h.date_changement, h.id
                    ) AS previous_code,
                    h.date_changement,
                    h.utilisateur_id,
                    h.commentaire,
                    h.motif_echec
                FROM statut.historique_statuts h
                JOIN statut.statuts s
                    ON s.id = h.statut_id
            )
            SELECT
                h.id,
                c.numero_suivi,
                h.previous_code,
                h.code,
                h.date_changement,
                COALESCE(
                    u.prenom || ' ' || u.nom,
                    'Système'
                ) AS utilisateur,
                COALESCE(
                    NULLIF(h.commentaire, ''),
                    NULLIF(h.motif_echec, ''),
                    ''
                ) AS note
            FROM ordered_history h
            JOIN scoped c ON c.id = h.colis_id
            LEFT JOIN auth.users u
                ON u.id = h.utilisateur_id
            ORDER BY h.date_changement DESC, h.id DESC
        """),
        params,
    ).mappings().all()

    return [
        {
            "id": str(row["id"]),
            "parcelId": row["numero_suivi"],
            "from": (
                STATUS_MAP.get(row["previous_code"])
                if row["previous_code"]
                else None
            ),
            "to": STATUS_MAP.get(row["code"], "pending"),
            "at": row["date_changement"].isoformat(),
            "by": row["utilisateur"],
            "note": row["note"],
        }
        for row in rows
    ]

@router.get("/agency/{agency_id}")
def get_agency_details(
    agency_id: UUID,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if current_user["role"] != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Accès réservé au Super Administrateur",
        )

    # Informations de l'agence
    agency = db.execute(
        text("""
            SELECT
                id,
                nom_agence,
                ville,
                adresse,
                telephone,
                is_active,
                created_at
            FROM agence.agences
            WHERE id = :agency_id
        """),
        {"agency_id": agency_id},
    ).mappings().first()

    if not agency:
        raise HTTPException(
            status_code=404,
            detail="Agence introuvable",
        )

    latest_status = """
        SELECT DISTINCT ON (h.colis_id)
            h.colis_id,
            s.code
        FROM statut.historique_statuts h
        JOIN statut.statuts s ON s.id = h.statut_id
        ORDER BY h.colis_id, h.date_changement DESC, h.id DESC
    """

    params = {"agency_id": agency_id}

    # Statistiques des colis
    stats_row = db.execute(
        text(f"""
            WITH latest AS ({latest_status})
            SELECT
                COUNT(c.id) AS total,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'LIVRE'
                ) AS delivered,

                COUNT(c.id) FILTER (
                    WHERE COALESCE(l.code, 'CREE') = 'ECHEC'
                ) AS failed,

                COUNT(c.id) FILTER (
                    WHERE EXISTS (
                        SELECT 1
                        FROM livraison.livraison_colis lc
                        JOIN livraison.livraisons liv
                            ON liv.id = lc.livraison_id
                        WHERE lc.colis_id = c.id
                          AND liv.date_arrivee_prevue < NOW()
                          AND liv.date_arrivee_reelle IS NULL
                          AND liv.etat_livraison <> 'LIVREE'
                    )
                ) AS late

            FROM colis.colis c
            LEFT JOIN latest l ON l.colis_id = c.id
            WHERE c.agence_expedition_id = :agency_id
        """),
        params,
    ).mappings().one()

    total = stats_row["total"]
    delivered = stats_row["delivered"]
    failed = stats_row["failed"]
    denominator = delivered + failed

    stats = {
        "total": total,
        "delivered": delivered,
        "late": stats_row["late"],
        "successRate": (
            delivered / denominator * 100 if denominator else 0
        ),
    }

    # Administrateurs de l'agence
    admin_rows = db.execute(
        text("""
            SELECT
                u.id,
                u.prenom || ' ' || u.nom AS name,
                u.email,
                u.is_active AS active
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            WHERE r.nom = 'ADMIN'
              AND u.agence_id = :agency_id
            ORDER BY u.prenom, u.nom
        """),
        params,
    ).mappings().all()

    admins = [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "email": row["email"],
            "active": row["active"],
        }
        for row in admin_rows
    ]

    # Livreurs de l'agence
    courier_rows = db.execute(
        text("""
            SELECT
                u.id,
                u.prenom || ' ' || u.nom AS name,
                u.disponible,
                u.is_active,

                COUNT(DISTINCT liv.id) FILTER (
                    WHERE liv.etat_livraison = 'LIVREE'
                ) AS done,

                COUNT(DISTINCT liv.id) FILTER (
                    WHERE liv.etat_livraison IN (
                        'EN_ATTENTE',
                        'EN_TRANSIT',
                        'ARRIVEE_A_L_AGENCE'
                    )
                ) AS ongoing

            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            LEFT JOIN livraison.livraisons liv
                ON liv.livreur_id = u.id
               AND (
                    liv.agence_depart_id = :agency_id
                    OR liv.agence_arrivee_id = :agency_id
               )
            WHERE r.nom = 'LIVREUR'
              AND u.agence_id = :agency_id
            GROUP BY u.id, u.prenom, u.nom,
                     u.disponible, u.is_active
            ORDER BY u.prenom, u.nom
        """),
        params,
    ).mappings().all()

    couriers = []

    for row in courier_rows:
        done = row["done"]
        ongoing = row["ongoing"]
        resolved = done

        couriers.append({
            "id": str(row["id"]),
            "name": row["name"],
            "total": done + ongoing,
            "rate": done / resolved * 100 if resolved else 0,
            "available": bool(row["disponible"]) and row["is_active"],
        })

    # Derniers colis enregistrés par cette agence
    parcel_rows = db.execute(
        text(f"""
            WITH latest AS ({latest_status})
            SELECT
                c.id,
                c.numero_suivi,
                c.expediteur_ville,
                c.destinataire_ville,
                COALESCE(l.code, 'CREE') AS code
            FROM colis.colis c
            LEFT JOIN latest l ON l.colis_id = c.id
            WHERE c.agence_expedition_id = :agency_id
            ORDER BY c.date_enregistrement DESC
            LIMIT 6
        """),
        params,
    ).mappings().all()

    latest = [
        {
            "id": row["numero_suivi"],
            "fromCity": row["expediteur_ville"],
            "toCity": row["destinataire_ville"],
            "status": STATUS_MAP.get(row["code"], "pending"),
        }
        for row in parcel_rows
    ]

    # Activité quotidienne sur 30 jours
    start_date = date.today() - timedelta(days=29)

    series_rows = db.execute(
        text("""
            SELECT
                d.day::date AS day,

                (
                    SELECT COUNT(*)
                    FROM colis.colis c
                    WHERE c.agence_expedition_id = :agency_id
                      AND c.date_enregistrement::date = d.day::date
                ) AS created,

                (
                    SELECT COUNT(DISTINCT h.colis_id)
                    FROM statut.historique_statuts h
                    JOIN statut.statuts s ON s.id = h.statut_id
                    JOIN colis.colis c ON c.id = h.colis_id
                    WHERE c.agence_expedition_id = :agency_id
                      AND s.code = 'LIVRE'
                      AND h.date_changement::date = d.day::date
                ) AS delivered

            FROM generate_series(
                CAST(:start_date AS date),
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS d(day)
            ORDER BY d.day
        """),
        {
            "agency_id": agency_id,
            "start_date": start_date,
        },
    ).mappings().all()

    series = [
        {
            "label": row["day"].strftime("%d/%m"),
            "created": row["created"],
            "delivered": row["delivered"],
        }
        for row in series_rows
    ]

    return {
        "id": str(agency["id"]),
        "name": agency["nom_agence"],
        "city": agency["ville"],
        "address": agency["adresse"] or "",
        "phone": agency["telephone"] or "",
        "active": agency["is_active"],
        "openedAt": agency["created_at"].isoformat(),
        "stats": stats,
        "series": series,
        "admins": admins,
        "couriers": couriers,
        "latest": latest,
    }

