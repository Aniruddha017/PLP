from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine directory paths
CURRENT_DIR = Path(__file__).resolve().parent
CHATBOT_ROOT = CURRENT_DIR.parent.parent
PROJECT_ROOT = CHATBOT_ROOT.parent


class Settings(BaseSettings):
    # Groq
    groq_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"

    # Supabase standard keys
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Vite / Frontend fallback aliases from root .env
    vite_supabase_url: str = ""
    vite_supabase_anon_key: str = ""
    public_supabase_url: str = ""
    public_supabase_anon_key: str = ""

    # Application
    app_name: str = "AI Personalized Learning - Chatbot Service"
    debug: bool | str = False

    model_config = SettingsConfigDict(
        env_file=[
            str(CHATBOT_ROOT / ".env"),
            str(PROJECT_ROOT / ".env"),
            ".env",
        ],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def effective_supabase_url(self) -> str:
        return (
            self.supabase_url or
            self.vite_supabase_url or
            self.public_supabase_url or
            ""
        )

    @property
    def effective_supabase_anon_key(self) -> str:
        return (
            self.supabase_anon_key or
            self.vite_supabase_anon_key or
            self.public_supabase_anon_key or
            ""
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
