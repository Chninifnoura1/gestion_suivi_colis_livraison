from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db


security = HTTPBearer()


def get_current_livreur(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )

    result = db.execute(
        text("""
            SELECT
                u.id,
                u.agence_id,
                u.is_active,
                u.disponible,
                u.ville_actuelle,
                u.peut_transport,
                u.peut_livrer_client,
                a.ville AS agence_ville,
                r.nom AS role
            FROM auth.users u
            LEFT JOIN agence.agences a ON a.id = u.agence_id
            JOIN auth.roles r ON r.id = u.role_id
            WHERE u.id = :user_id

        """),
        {"user_id": user_id},
    ).mappings().first()
    if result is None or not result["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou désactivé",
        )

    if result["role"] != "LIVREUR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux livreurs",
        )
    
    return result

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )

    result = db.execute(
        text("""
            SELECT
                u.id,
                u.agence_id,
                u.is_active,
                u.disponible,
                u.ville_actuelle,
                u.peut_transport,
                u.peut_livrer_client,
                a.ville AS agence_ville,
                r.nom AS role
            FROM auth.users u
            LEFT JOIN agence.agences a ON a.id = u.agence_id
            JOIN auth.roles r ON r.id = u.role_id
            WHERE u.id = :user_id
        """),
        {"user_id": user_id},
    ).mappings().first()

    if result is None or not result["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou désactivé",
        )
    print("DEBUG AUTH:", result["role"], result["agence_id"], flush=True)
    if result["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )

    return result

def get_current_livraison_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )

    result = db.execute(
        text("""
            SELECT
                u.id,
                u.agence_id,
                u.is_active,
                r.nom AS role
            FROM auth.users u
            JOIN auth.roles r ON r.id = u.role_id
            WHERE u.id = :user_id
        """),
        {"user_id": user_id},
    ).mappings().first()

    if result is None or not result["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou désactivé",
        )

    if result["role"] not in ("ADMIN", "LIVREUR"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé",
        )

    return result