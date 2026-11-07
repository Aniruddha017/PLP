from groq import Groq
from groq.types.chat import ChatCompletionMessageParam

from app.core.config import get_settings


class LLMService:
    def __init__(self):
        self._client: Groq | None = None

    @property
    def client(self) -> Groq | None:
        """
        Lazily initializes the Groq client only when an API key is available,
        preventing crash-on-import if GROQ_API_KEY is not yet populated.
        """
        if self._client is None:
            settings = get_settings()
            if settings.groq_api_key and settings.groq_api_key.strip():
                try:
                    self._client = Groq(api_key=settings.groq_api_key.strip())
                except Exception as e:
                    print(f"[LLMService] Failed to initialize Groq client: {e}")
        return self._client

    @property
    def model(self) -> str:
        return get_settings().llm_model

    def generate_response(
        self,
        messages: list[ChatCompletionMessageParam],
    ) -> str:
        client = self.client
        if not client:
            # Informative fallback if GROQ_API_KEY is not configured
            return (
                "Hello! I am your AI Socratic Tutor. "
                "To enable live LLaMA 3.3 generation from this microservice, please add your GROQ_API_KEY to .env. "
                "In the meantime, consider this foundational principle: how do the initial boundary conditions relate to the core theorem?"
            )

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"[LLMService] Groq API call error: {e}")
            return f"I encountered an error generating the explanation: {str(e)}"


llm_service = LLMService()
