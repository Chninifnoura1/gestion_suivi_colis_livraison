
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db


security = HTTPBearer()


def get_current_user(
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
            status_code=401,
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
            status_code=401,
            detail="Utilisateur introuvable ou désactivé",
        )

    if result["role"] not in ("ADMIN", "SUPER_ADMIN", "LIVREUR"):
        raise HTTPException(
            status_code=403,
            detail="Accès refusé",
        )

    return result
