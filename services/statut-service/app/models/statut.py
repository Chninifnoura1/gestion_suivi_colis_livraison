import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# Reference table: the list of possible statuses (created by database/init)
class Statut(Base):
    __tablename__ = "statuts"
    __table_args__ = {"schema": "statut"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    libelle: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )


# History table: one row each time the status of a parcel changes
class HistoriqueStatut(Base):
    __tablename__ = "historique_statuts"
    __table_args__ = {"schema": "statut"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Id of the parcel (owned by the Colis Service)
    colis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False
    )

    statut_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("statut.statuts.id"),
        nullable=False
    )

    # Id of the user who made the change (owned by the Auth Service)
    utilisateur_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )

    date_changement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    localisation: Mapped[str | None] = mapped_column(Text, nullable=True)
    commentaire: Mapped[str | None] = mapped_column(Text, nullable=True)
    motif_echec: Mapped[str | None] = mapped_column(Text, nullable=True)

    statut: Mapped["Statut"] = relationship(lazy="joined")

    # Shortcuts used by the API response
    @property
    def code(self) -> str:
        return self.statut.code

    @property
    def libelle(self) -> str:
        return self.statut.libelle
