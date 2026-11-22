from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EtapeTrajetCreate(BaseModel):
    agence_id: UUID
    ordre: int = Field(ge=0)


class EtapeTrajetResponse(BaseModel):
    id: UUID
    livraison_id: UUID
    agence_id: UUID
    ordre: int
    etat: str
    date_arrivee_reelle: datetime | None = None
    date_confirmation: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)