from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


# Tables referenced by livraison-service but owned by other services.
Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)

Table(
    "agences",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="agence",
)