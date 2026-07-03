from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:5173"

    # AI Provider
    ai_provider: str = "gemini"
    gemini_api_key: str = ""
    groq_api_key: str = ""
    grok_api_key: str = ""
    openrouter_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""  # Project Settings > API > JWT Settings

    # Security
    secret_key: str = "change_me_in_production"

    # Sentry
    sentry_dsn: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
