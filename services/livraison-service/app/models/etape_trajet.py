import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class EtapeTrajet(Base):
    __tablename__ = "etapes_trajet"
    __table_args__ = (
        UniqueConstraint(
            "livraison_id",
            "ordre",
            name="uq_etape_livraison_ordre",
        ),
        UniqueConstraint(
            "livraison_id",
            "agence_id",
            name="uq_etape_livraison_agence",
        ),
        CheckConstraint("ordre >= 0"),
        CheckConstraint(
            "etat IN ('EN_ATTENTE', 'EN_COURS', 'ARRIVEE', 'CONFIRMEE')"
        ),
        {"schema": "livraison"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    livraison_id = Column(
        UUID(as_uuid=True),
        ForeignKey("livraison.livraisons.id", ondelete="CASCADE"),
        nullable=False,
    )

    agence_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agence.agences.id"),
        nullable=False,
    )

    ordre = Column(Integer, nullable=False)

    etat = Column(String(30), nullable=False, default="EN_ATTENTE")

    date_arrivee_reelle = Column(DateTime(timezone=True), nullable=True)

    date_confirmation = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )