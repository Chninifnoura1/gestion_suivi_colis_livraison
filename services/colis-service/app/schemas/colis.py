from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Shared fields
class ColisBase(BaseModel):
    description: str | None = None
    poids: Decimal = Field(gt=0, max_digits=10, decimal_places=2)

    expediteur_nom: str = Field(min_length=2, max_length=150)
    expediteur_telephone: str = Field(min_length=5, max_length=30)
    expediteur_adresse: str = Field(min_length=5)
    expediteur_ville: str = Field(min_length=2, max_length=100)

    destinataire_nom: str = Field(min_length=2, max_length=150)
    destinataire_telephone: str = Field(min_length=5, max_length=30)
    destinataire_email: EmailStr | None = None
    destinataire_adresse: str = Field(min_length=5)
    destinataire_ville: str = Field(min_length=2, max_length=100)


# CREATE
# CREATE
class ColisCreate(ColisBase):
    agence_expedition_id: UUID | None = None

# UPDATE
class ColisUpdate(BaseModel):
    description: str | None = None
    poids: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=10,
        decimal_places=2,
    )

    expediteur_nom: str | None = Field(default=None, min_length=2, max_length=150)
    expediteur_telephone: str | None = Field(default=None, min_length=5, max_length=30)
    expediteur_adresse: str | None = Field(default=None, min_length=5)
    expediteur_ville: str | None = Field(default=None, min_length=2, max_length=100)

    destinataire_nom: str | None = Field(default=None, min_length=2, max_length=150)
    destinataire_telephone: str | None = Field(default=None, min_length=5, max_length=30)
    destinataire_email: EmailStr | None = None
    destinataire_adresse: str | None = Field(default=None, min_length=5)
    destinataire_ville: str | None = Field(default=None, min_length=2, max_length=100)


# RESPONSE

# RESPONSE
class ColisResponse(ColisBase):
    id: UUID
    numero_suivi: str
    date_enregistrement: datetime
    agence_expedition_id: UUID
    agence_destination_id: UUID | None = None
    agence_actuelle_id: UUID
    can_modify: bool = False
    model_config = ConfigDict(from_attributes=True)

