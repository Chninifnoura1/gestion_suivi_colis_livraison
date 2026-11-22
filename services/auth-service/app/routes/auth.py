
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from uuid import UUID
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.password import verify_password, hash_password
from app.models.user import User, Role, Agence
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    AdminCreate,
    CourierCreate,
    AgencyCreate,
    AgencyResponse,
    CourierUpdate,
    VilleActuelleUpdate,
    DisponibiliteUpdate,
    ProfileUpdate,
    PasswordChange,
    AdminCreate,
    AdminUpdate,
)
from app.services.auth_service import (
    authenticate_user,
    create_admin,
    create_courier,
    create_agency,
    update_courier,
    create_admin,
    update_admin,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    result = authenticate_user(
        db=db,
        email=credentials.email,
        password=credentials.password,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user
@router.put("/me/profile", response_model=UserResponse)
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prenom = data.prenom.strip()
    nom = data.nom.strip()
    email = data.email.strip().lower()
    telephone = data.telephone.strip() if data.telephone else None
    matricule = data.matricule.strip() if data.matricule else None

    if not prenom or not nom or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le prénom, le nom et l'email sont obligatoires.",
        )

    existing_email = (
        db.query(User)
        .filter(
            func.lower(User.email) == email,
            User.id != current_user.id,
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette adresse e-mail est déjà utilisée.",
        )

    if matricule:
        existing_matricule = (
            db.query(User)
            .filter(
                User.matricule == matricule,
                User.id != current_user.id,
            )
            .first()
        )

        if existing_matricule:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ce matricule est déjà utilisé.",
            )

    current_user.prenom = prenom
    current_user.nom = nom
    current_user.email = email
    current_user.telephone = telephone
    if current_user.role != "SUPER_ADMIN":
        current_user.matricule = matricule

    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible d'enregistrer ces informations. Vérifiez l'email et le matricule.",
        )

    return current_user

@router.put("/me/password")
def change_my_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe actuel est incorrect.",
        )

    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les deux nouveaux mots de passe ne correspondent pas.",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l'ancien.",
        )

    current_user.password_hash = hash_password(data.new_password)

    db.commit()

    return {"message": "Mot de passe modifié avec succès."}
@router.get("/villes")
def list_active_cities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "LIVREUR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux livreurs.",
        )

    cities = (
        db.query(Agence.ville)
        .filter(Agence.is_active.is_(True))
        .distinct()
        .order_by(Agence.ville)
        .all()
    )

    return [city[0] for city in cities if city[0]]


@router.put("/me/ville-actuelle", response_model=UserResponse)
def update_my_current_city(
    data: VilleActuelleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "LIVREUR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action réservée aux livreurs.",
        )

    city = data.ville_actuelle.strip()

    if not city:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez choisir une ville valide.",
        )

    agency = (
        db.query(Agence)
        .filter(
            Agence.is_active.is_(True),
            func.lower(func.trim(Agence.ville)) == city.lower(),
        )
        .first()
    )

    if not agency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette ville ne correspond à aucune agence active.",
        )

    active_mission = db.execute(
        text("""
            SELECT 1
            FROM livraison.livraisons
            WHERE livreur_id = :livreur_id
              AND etat_livraison::text IN ('EN_ATTENTE', 'EN_TRANSIT')
            LIMIT 1
        """),
        {"livreur_id": str(current_user.id)},
    ).first()

    if active_mission:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de changer de ville pendant une mission active.",
        )

    current_user.ville_actuelle = agency.ville.strip()
    db.commit()
    db.refresh(current_user)

    current_user.role = "LIVREUR"
    return current_user


@router.put("/me/disponibilite", response_model=UserResponse)
def update_my_availability(
    data: DisponibiliteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "LIVREUR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action réservée aux livreurs.",
        )
    if data.disponible:
        trajet_actif = db.execute(
            text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM livraison.livraisons
                    WHERE livreur_id = :livreur_id
                      AND type_mission = 'TRANSPORT_INTER_AGENCES'
                      AND etat_livraison IN ('EN_ATTENTE', 'EN_TRANSIT')
                )
            """),
            {"livreur_id": current_user.id},
        ).scalar()

        if trajet_actif:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vous ne pouvez pas devenir disponible avant la confirmation de l'arrivée finale du trajet.",
            )
    current_user.disponible = data.disponible
    db.commit()
    db.refresh(current_user)

    current_user.role = "LIVREUR"
    return current_user
@router.get("/agencies")
def list_agencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au Super Administrateur.",
        )

    agencies = (
        db.query(Agence)
        .order_by(Agence.nom_agence)
        .all()
    )

    admins = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.nom == "ADMIN")
        .all()
    )

    admins_by_agency = {
        admin.agence_id: f"{admin.prenom} {admin.nom}".strip()
        for admin in admins
        if admin.agence_id is not None
    }

    return [
        {
            "id": str(agency.id),
            "nom_agence": agency.nom_agence,
            "ville": agency.ville,
            "adresse": agency.adresse,
            "telephone": agency.telephone,
            "is_active": agency.is_active,
            "created_at": agency.created_at,
            "admin": admins_by_agency.get(agency.id),
        }
        for agency in agencies
    ]
@router.post(
    "/agencies",
    response_model=AgencyResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.put("/agencies/{agency_id}", response_model=AgencyResponse)
def update_agency_account(
    agency_id: UUID,
    data: AgencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au Super Administrateur.",
        )

    agency = db.query(Agence).filter(Agence.id == agency_id).first()

    if not agency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agence introuvable.",
        )

    existing_city = (
        db.query(Agence)
        .filter(
            func.lower(Agence.ville) == data.ville.strip().lower(),
            Agence.id != agency_id,
        )
        .first()
    )

    if existing_city:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une agence existe déjà dans cette ville.",
        )

    agency.nom_agence = data.nom_agence.strip()
    agency.ville = data.ville.strip()
    agency.adresse = data.adresse.strip() if data.adresse else None
    agency.telephone = data.telephone.strip() if data.telephone else None

    try:
        db.commit()
        db.refresh(agency)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de modifier cette agence.",
        )

    return agency

@router.get("/active-agency-cities")
def list_active_agency_cities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cities = (
        db.query(Agence.ville)
        .filter(Agence.is_active.is_(True))
        .distinct()
        .order_by(Agence.ville)
        .all()
    )

    return [city[0] for city in cities if city[0]]
@router.get("/active-agencies")
def list_active_agencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé à l'Administrateur.",
        )

    agencies = (
        db.query(Agence)
        .filter(Agence.is_active.is_(True))
        .order_by(Agence.ville, Agence.nom_agence)
        .all()
    )

    return [
        {
            "id": str(agency.id),
            "nom_agence": agency.nom_agence,
            "ville": agency.ville,
        }
        for agency in agencies
    ]
@router.post(
    "/admins",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_account(
    data: AdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = create_admin(db, data, current_user)
    user.role = "ADMIN"
    return user

@router.get("/admins", response_model=list[UserResponse])
def list_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au Super Administrateur.",
        )

    admins = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.nom == "ADMIN")
        .order_by(User.created_at.desc())
        .all()
    )

    for admin in admins:
        admin.role = "ADMIN"

    return admins
@router.put("/admins/{admin_id}", response_model=UserResponse)
def update_admin_account(
    admin_id: UUID,
    data: AdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin = update_admin(db, admin_id, data, current_user)
    admin.role = "ADMIN"
    return admin
@router.post(
    "/couriers",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_courier_account(
    data: CourierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = create_courier(db, data, current_user)
    user.role = "LIVREUR"
    return user

@router.get("/couriers", response_model=list[UserResponse])
def list_couriers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs.",
        )

    query = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.nom == "LIVREUR")
    )

    if current_user.role == "ADMIN":
        query = query.filter(User.agence_id == current_user.agence_id)

    couriers = query.order_by(User.created_at.desc()).all()

    for courier in couriers:
        courier.role = "LIVREUR"

    return couriers


@router.put("/couriers/{courier_id}", response_model=UserResponse)
def update_courier_account(
    courier_id: UUID,
    data: CourierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    courier = update_courier(db, courier_id, data, current_user)
    courier.role = "LIVREUR"
    return courier
