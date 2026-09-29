from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Groq
    groq_api_key: str
    llm_model: str = "llama-3.3-70b-versatile"

    # Supabase
    supabase_url: str
    supabase_anon_key: str

    # Application
    app_name: str = "AI Personalized Learning - Chatbot Service"
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()