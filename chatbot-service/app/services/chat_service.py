from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service
from app.db.supabase import get_supabase_admin_client


class ChatService:
    def generate_response(
        self,
        user_message: str,
        conversation_id: str | None = None,
        user_id: str | None = None,
    ) -> str:
        """
        Generates a personalized Socratic tutor response.
        If conversation_id is provided, loads the subject, topic, student learning goal,
        and past chat history from Supabase to provide continuity and context.
        """
        system_content = (
            "You are an expert AI University Tutor specializing in STEM and Humanities. "
            "Adopt an encouraging, rigorous Socratic teaching method. "
            "Explain concepts clearly from first principles, use formulas or notation where helpful, "
            "and end your response with an intuitive thought-provoking follow-up question to test the student's understanding."
        )

        history_messages: list[ChatCompletionMessageParam] = []

        # 1. Fetch Subject, Topic, and Chat History from Supabase if conversation_id exists
        if conversation_id:
            try:
                db = get_supabase_admin_client()

                # A. Retrieve conversation title, subject, and topic
                conv_res = (
                    db.table("conversations")
                    .select("title, subject, topic")
                    .eq("id", conversation_id)
                    .execute()
                )
                if conv_res.data and len(conv_res.data) > 0:
                    conv = conv_res.data[0]
                    subject = conv.get("subject") or "General"
                    topic = conv.get("topic") or conv.get("title") or "General Inquiry"
                    system_content += f"\n\nCurrent Subject: {subject}\nCurrent Topic: {topic}"

                # B. Retrieve student profile details if user_id is provided
                if user_id:
                    profile_res = (
                        db.table("profiles")
                        .select("full_name, learning_goal")
                        .eq("id", user_id)
                        .execute()
                    )
                    if profile_res.data and len(profile_res.data) > 0:
                        profile = profile_res.data[0]
                        name = profile.get("full_name") or "Student"
                        goal = profile.get("learning_goal")
                        system_content += f"\nStudent Name: {name}"
                        if goal:
                            system_content += f"\nStudent Learning Goal: {goal}"

                # C. Retrieve the last 8 messages in this thread for conversational memory
                msg_res = (
                    db.table("messages")
                    .select("role, content")
                    .eq("conversation_id", conversation_id)
                    .order("created_at", desc=False)
                    .limit(8)
                    .execute()
                )

                if msg_res.data:
                    for m in msg_res.data:
                        role = m.get("role")
                        content = m.get("content")
                        if role in ("user", "assistant", "system") and content:
                            history_messages.append({"role": role, "content": content})
            except Exception as e:
                print(f"[ChatService] Could not retrieve Supabase context: {e}")

        # Assemble prompt sequence: System -> History -> Current Prompt
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_content},
            *history_messages,
            {"role": "user", "content": user_message},
        ]

        return llm_service.generate_response(messages)


chat_service = ChatService()
