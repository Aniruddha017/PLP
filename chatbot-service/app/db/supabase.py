from supabase import Client, create_client
from app.core.config import get_settings


def get_supabase_client(access_token: str | None = None) -> Client:
    """
    Returns a Supabase client configured with the project URL and anonymous key.
    Optionally authenticates with the student's forwarded Bearer JWT.
    """
    settings = get_settings()
    url = settings.effective_supabase_url
    key = settings.effective_supabase_anon_key

    client = create_client(url, key)
    if access_token:
        client.postgrest.auth(access_token)
    return client


def get_supabase_admin_client() -> Client:
    """
    Returns an administrative Supabase client using the Service Role Key (if available)
    or falls back to the anonymous key.
    """
    settings = get_settings()
    url = settings.effective_supabase_url
    key = settings.supabase_service_role_key or settings.effective_supabase_anon_key

    return create_client(url, key)
