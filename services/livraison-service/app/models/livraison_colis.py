import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class LivraisonColis(Base):
    __tablename__ = "livraison_colis"
    __table_args__ = {"schema": "livraison"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    livraison_id = Column(
        UUID(as_uuid=True),
        ForeignKey("livraison.livraisons.id", ondelete="CASCADE"),
        nullable=False,
    )

    colis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("colis.colis.id"),
        nullable=False,
    )

    date_tentative = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    ordre_livraison = Column(Integer, nullable=True)

    agence_chargement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agence.agences.id"),
        nullable=True,
    )

    agence_dechargement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agence.agences.id"),
        nullable=True,
    )