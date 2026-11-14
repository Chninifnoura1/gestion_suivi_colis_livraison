from pathlib import Path
from sqlalchemy.engine import URL
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root: gestion_suivi_colis_livraison/
CONFIG_PATH = Path(__file__).resolve()
PROJECT_ROOT = (
    CONFIG_PATH.parents[3]
    if len(CONFIG_PATH.parents) > 3
    else Path("/app")
)


class Settings(BaseSettings):
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    # Local execution uses localhost.
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self):
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.DATABASE_HOST,
            port=self.DATABASE_PORT,
            database=self.POSTGRES_DB,
        )


settings = Settings()
