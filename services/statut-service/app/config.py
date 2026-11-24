
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    AUTH_SECRET_KEY: str
    INTERNAL_API_KEY: str
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        extra="ignore",
    )


settings = Settings()
