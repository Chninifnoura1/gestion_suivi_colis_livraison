from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


# PostgreSQL connection
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

# Database session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for SQLAlchemy models
Base = declarative_base()


# Dependency: provide a database session to each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
