from groq.types.chat import ChatCompletionMessageParam

from app.services.llm_service import llm_service


class ChatService:
    def generate_response(self, user_message: str) -> str:
        messages: list[ChatCompletionMessageParam] = [
            {
                "role": "system",
                "content": (
                    "You are an AI educational tutor. "
                    "Explain concepts clearly and accurately. "
                    "Adapt explanations to the student's level when possible. "
                    "Use examples when they help understanding."
                ),
            },
            {
                "role": "user",
                "content": user_message,
            },
        ]

        return llm_service.generate_response(messages)


chat_service = ChatService()
