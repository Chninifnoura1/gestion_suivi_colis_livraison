from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# The only status codes allowed (same list as the statut.statuts table)
StatutCode = Literal[
    "CREE",
    "EN_ATTENTE",
    "PRIS_EN_CHARGE",
    "EN_COURS",
    "ECHEC",
    "NOUVELLE_TENTATIVE",
    "LIVRE",
]


# Schema used when an agent records a status change
class StatutCreate(BaseModel):
    colis_id: UUID
    code: StatutCode
    utilisateur_id: UUID | None = None
    localisation: str | None = None
    commentaire: str | None = None
    motif_echec: str | None = None


# Schema returned by the API
class StatutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    colis_id: UUID
    code: str
    libelle: str
    utilisateur_id: UUID | None
    localisation: str | None
    commentaire: str | None
    motif_echec: str | None
    date_changement: datetime
