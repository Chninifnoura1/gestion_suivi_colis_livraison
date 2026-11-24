import time
import uuid
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.config import settings
from app.dependencies.auth import get_current_user


def make_credentials(payload, key=None):
    token = jwt.encode(
        payload,
        key or settings.AUTH_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def make_db(user):
    db = MagicMock()
    db.execute.return_value.mappings.return_value.first.return_value = user
    return db


def test_token_garbage_refuse():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="pas-un-jwt")
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(None))
    assert exc.value.status_code == 401


def test_token_mauvaise_cle_refuse():
    creds = make_credentials({"sub": str(uuid.uuid4())}, key="une-autre-cle-secrete-assez-longue")
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(None))
    assert exc.value.status_code == 401


def test_token_expire_refuse():
    creds = make_credentials({"sub": str(uuid.uuid4()), "exp": int(time.time()) - 60})
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(None))
    assert exc.value.status_code == 401


def test_token_sans_sub_refuse():
    creds = make_credentials({"nom": "test"})
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(None))
    assert exc.value.status_code == 401


def test_token_sub_pas_un_uuid_refuse():
    creds = make_credentials({"sub": "123"})
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(None))
    assert exc.value.status_code == 401


def test_utilisateur_introuvable():
    creds = make_credentials({"sub": str(uuid.uuid4())})
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(None))
    assert exc.value.status_code == 401


def test_utilisateur_desactive():
    creds = make_credentials({"sub": str(uuid.uuid4())})
    user = {"id": uuid.uuid4(), "agence_id": None, "is_active": False, "role": "ADMIN"}
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(user))
    assert exc.value.status_code == 401


def test_role_non_autorise():
    creds = make_credentials({"sub": str(uuid.uuid4())})
    user = {"id": uuid.uuid4(), "agence_id": None, "is_active": True, "role": "CLIENT"}
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds, make_db(user))
    assert exc.value.status_code == 403


def test_utilisateur_valide_retourne_le_user():
    creds = make_credentials({"sub": str(uuid.uuid4())})
    user = {"id": uuid.uuid4(), "agence_id": None, "is_active": True, "role": "LIVREUR"}
    assert get_current_user(creds, make_db(user)) == user
