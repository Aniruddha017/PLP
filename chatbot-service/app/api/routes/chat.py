from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import chat_service
from app.db.supabase import get_supabase_client, get_supabase_admin_client

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


async def get_current_user_optional(authorization: str | None = Header(None)):
    """
    Extracts and validates Supabase JWT token if provided.
    Permits guest/demo mode while securing student context when authenticated.
    """
    if not authorization:
        return None

    token = authorization.replace("Bearer ", "").strip()
    if not token:
        return None

    try:
        client = get_supabase_client()
        user_response = client.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user
    except Exception as e:
        # Invalid or expired token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
        )

    return None


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user_optional),
):
    user_id = current_user.id if current_user else None

    # 1. Generate pedagogical Socratic response with full Supabase context & history
    response_data = chat_service.generate_response(
        user_message=request.message,
        conversation_id=request.conversation_id,
        user_id=user_id,
    )

    message_text = response_data.get("message") or ""
    cards_list = response_data.get("cards") or []
    key_insight = response_data.get("key_insight")
    follow_up_question = response_data.get("follow_up_question")

    # 2. If conversation_id is provided, persist assistant reply to public.messages with rich pedagogical structures
    if request.conversation_id:
        try:
            admin_client = get_supabase_admin_client()
            admin_client.table("messages").insert({
                "conversation_id": request.conversation_id,
                "role": "assistant",
                "content": message_text,
                "cards": cards_list,
                "key_insight": key_insight,
                "metadata": {
                    "follow_up_question": follow_up_question,
                } if follow_up_question else {},
            }).execute()
        except Exception as e:
            # Non-blocking log if DB insertion encounters issues
            print(f"[ChatRoute] Failed to record message history in Supabase: {e}")

    return ChatResponse(
        message=message_text,
        cards=cards_list,
        key_insight=key_insight,
        follow_up_question=follow_up_question,
    )
