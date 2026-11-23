import json
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
        json_mode: bool = False,
    ) -> str:
        client = self.client
        if not client:
            # Informative fallback if GROQ_API_KEY is not configured
            if json_mode:
                return (
                    '{\n'
                    '  "message": "Hello! I am your AI Socratic Tutor. To enable live LLaMA 3.3 generation from this microservice, please configure your GROQ_API_KEY in .env. In the meantime, consider this foundational principle: how do the initial boundary conditions relate to the core theorem?",\n'
                    '  "cards": [\n'
                    '    {"title": "Core Principle", "description": "Formulas and algorithms build from invariant mathematical properties.", "formula": "P(E|H) = \\\\frac{P(H \\\\cap E)}{P(E)}"},\n'
                    '    {"title": "Algorithmic Invariant", "description": "Analyzing inductive bases reveals asymptotic limits.", "formula": "T(n) = 2T(n/2) + O(n)"}\n'
                    '  ],\n'
                    '  "key_insight": "Mastering Computer Science topics requires linking mathematical definitions directly to algorithmic complexity.",\n'
                    '  "follow_up_question": "What is the primary constraint or edge case you would check first when implementing this?"\n'
                    '}'
                )
            return (
                "Hello! I am your AI Socratic Tutor. "
                "To enable live (changed to openai api from groq) LLaMA 3.3 generation from this microservice, please add your GROQ_API_KEY to .env. "
                "In the meantime, consider this foundational principle: how do the initial boundary conditions relate to the core theorem?"
            )

        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1500,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"[LLMService] Groq API call error: {e}")
            if json_mode:
                return json.dumps({
                    "message": f"I encountered an error generating the response: {str(e)}",
                    "cards": [],
                    "key_insight": None,
                    "follow_up_question": None,
                    "questions": [],
                    "roadmap": [],
                })
            return f"I encountered an error generating the response: {str(e)}"


llm_service = LLMService()
