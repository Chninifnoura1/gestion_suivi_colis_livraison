
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.config import settings
from app.models.user import User, Role, Agence
from app.services.password import verify_password, hash_password
from app.services.token import create_access_token


def authenticate_user(
    db: Session,
    email: str,
    password: str,
):
    result = (
        db.query(User, Role.nom)
        .options(joinedload(User.agence))
        .join(Role, User.role_id == Role.id)
        .filter(User.email == email)
        .first()
    )

    if result is None:
        return None

    user, role_name = result

    if not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    access_token = create_access_token(
        user_id=user.id,
        role=role_name,
        agence_id=user.agence_id,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "nom": user.nom,
            "prenom": user.prenom,
            "email": user.email,
            "role": role_name,
            "agence_id": user.agence_id,
            "agence": user.agence,
            "telephone": user.telephone,
            "matricule": user.matricule,
            "disponible": user.disponible,
        },
    }


def create_admin(db: Session, data, current_user: User):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le Super Admin peut créer un administrateur.",
        )

    agence = db.query(Agence).filter(
        Agence.id == data.agence_id,
        Agence.is_active.is_(True),
    ).first()

    if not agence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agence introuvable ou inactive.",
        )

    role = db.query(Role).filter(Role.nom == "ADMIN").first()
    if not role:
        raise HTTPException(status_code=500, detail="Rôle ADMIN introuvable.")

    user = User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role.id,
        agence_id=agence.id,
        telephone=data.telephone,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception as exc:
        db.rollback()
        if "unique" in str(exc).lower() or "idx_users" in str(exc).lower():
            raise HTTPException(
                status_code=409,
                detail="Cette adresse e-mail ou cette agence possède déjà un administrateur.",
            )
        raise

    return user

def update_admin(db: Session, admin_id, data, current_user: User):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le Super Admin peut modifier un administrateur.",
        )

    admin = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(
            User.id == admin_id,
            Role.nom == "ADMIN",
        )
        .first()
    )

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrateur introuvable.",
        )

    agence = (
        db.query(Agence)
        .filter(
            Agence.id == data.agence_id,
            Agence.is_active.is_(True),
        )
        .first()
    )

    if not agence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agence introuvable ou inactive.",
        )

    email = data.email.strip().lower()

    email_exists = (
        db.query(User)
        .filter(
            func.lower(User.email) == email,
            User.id != admin.id,
        )
        .first()
    )

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette adresse e-mail est déjà utilisée.",
        )

    admin.nom = data.nom.strip()
    admin.prenom = data.prenom.strip()
    admin.email = email
    admin.telephone = data.telephone.strip() if data.telephone else None
    admin.agence_id = agence.id
    if data.password:
        admin.password_hash = hash_password(data.password)  
    admin.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(admin)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de modifier cet administrateur : cette agence possède déjà un administrateur.",
        )

    return admin
def create_courier(db: Session, data, current_user: User):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un Admin peut créer un livreur.",
        )

    role = db.query(Role).filter(Role.nom == "LIVREUR").first()
    if not role:
        raise HTTPException(status_code=500, detail="Rôle LIVREUR introuvable.")

    matricule = f"LIV-{uuid.uuid4().hex[:8].upper()}"
    agence = (
        db.query(Agence)
        .filter(
            Agence.id == current_user.agence_id,
            Agence.is_active.is_(True),
        )
        .first()
    )

    if not agence:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'agence de cet administrateur est introuvable ou inactive.",
        )
    user = User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role.id,
        agence_id=current_user.agence_id,
        telephone=data.telephone,
        matricule=matricule,
        disponible=data.disponible,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        ville_actuelle=agence.ville.strip(),
        peut_transport=True,
        peut_livrer_client=False,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cette adresse e-mail existe déjà ou les données sont invalides.",
        )

    return user

def create_agency(db: Session, data, current_user: User):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le Super Admin peut créer une agence.",
        )

    nom_agence = data.nom_agence.strip()
    ville = data.ville.strip()

    if not nom_agence or not ville:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le nom de l'agence et la ville sont obligatoires.",
        )

    agence_existante = (
        db.query(Agence)
        .filter(func.lower(func.trim(Agence.ville)) == ville.lower())
        .first()
    )

    if agence_existante:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Une agence existe déjà dans la ville {ville}.",
        )

    agence = Agence(
        nom_agence=nom_agence,
        ville=ville,
        adresse=data.adresse.strip() if data.adresse and data.adresse.strip() else None,
        telephone=data.telephone.strip() if data.telephone and data.telephone.strip() else None,
        is_active=True,
    )

    try:
        db.add(agence)
        db.commit()
        db.refresh(agence)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Une agence existe déjà dans la ville {ville}.",
        )

    return agence


def update_courier(db: Session, courier_id, data, current_user: User):
    if current_user.role not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs.",
        )

    query = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(
            User.id == courier_id,
            Role.nom == "LIVREUR",
        )
    )

    if current_user.role == "ADMIN":
        query = query.filter(User.agence_id == current_user.agence_id)

    courier = query.first()

    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livreur introuvable dans votre agence.",
        )

    email = data.email.strip().lower()

    email_exists = (
        db.query(User)
        .filter(
            func.lower(User.email) == email,
            User.id != courier.id,
        )
        .first()
    )

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette adresse e-mail est déjà utilisée.",
        )

    courier.nom = data.nom.strip()
    courier.prenom = data.prenom.strip()
    courier.email = email
    courier.telephone = data.telephone.strip() if data.telephone else None
    courier.disponible = data.disponible
    courier.is_active = data.is_active
    courier.peut_transport = True
    courier.peut_livrer_client = False
    courier.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(courier)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de modifier ce livreur : données déjà utilisées.",
        )

    return courier
