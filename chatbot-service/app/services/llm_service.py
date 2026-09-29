from groq import Groq
from groq.types.chat import ChatCompletionMessageParam

from app.core.config import get_settings


class LLMService:
    def __init__(self):
        settings = get_settings()

        self.client = Groq(
            api_key=settings.groq_api_key
        )

        self.model = settings.llm_model

    def generate_response(
        self,
        messages: list[ChatCompletionMessageParam],
    ) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
        )

        return response.choices[0].message.content or ""


llm_service = LLMService()
