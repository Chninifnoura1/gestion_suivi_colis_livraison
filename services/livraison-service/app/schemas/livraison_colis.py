from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LivraisonColisCreate(BaseModel):
    colis_id: UUID
    ordre_livraison: int | None = None


class LivraisonColisResponse(BaseModel):
    id: UUID
    livraison_id: UUID
    colis_id: UUID
    date_tentative: datetime
    ordre_livraison: int | None

    model_config = ConfigDict(from_attributes=True)