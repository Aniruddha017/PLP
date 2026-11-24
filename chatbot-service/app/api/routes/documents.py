import uuid
from typing import Any
from fastapi import APIRouter, Depends, File, HTTPException, Header, UploadFile, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.db.supabase import get_supabase_client, get_supabase_admin_client
from app.services.document_parser import document_parser
from app.services.embedding_service import embedding_service
from app.services.agents.validation_agent import validation_agent
from app.services.agents.orchestrator import doc_orchestrator

router = APIRouter(prefix="/documents", tags=["documents"])


# --- Schemas ---
class DocumentChatRequest(BaseModel):
    message: str = Field(..., description="Student question regarding the document")
    chat_history: list[dict[str, str]] = Field(default_factory=list)


class QuestionGenRequest(BaseModel):
    difficulty: str = Field(default="Medium", description="Easy, Medium, or Hard")
    topic: str | None = Field(default=None, description="Optional subtopic filter")


class QuizGenRequest(BaseModel):
    num_questions: int = Field(default=5, ge=1, le=10)


class QuizEvaluateRequest(BaseModel):
    questions: list[dict[str, Any]] = Field(..., description="Original quiz questions")
    answers: dict[str, int] = Field(..., description="Mapping of question id to selected option index")


# --- Helper: Authentication ---
async def get_current_user_id(authorization: str | None = Header(None)) -> str:
    """
    Extracts and validates authenticated user ID from Supabase JWT token.
    Rejects missing, invalid, or expired tokens with HTTP 401.
    Demo mode is explicitly gated and only accessible if debug mode is active and no token is passed.
    """
    if not authorization:
        settings = get_settings()
        if bool(settings.debug):
            return "00000000-0000-0000-0000-000000000001"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Expected 'Bearer <token>'.",
        )

    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer authentication token.",
        )

    try:
        client = get_supabase_client()
        user_res = client.auth.get_user(token)
        if user_res and user_res.user:
            return user_res.user.id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for provided token.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
        )


# --- Endpoints ---

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Uploads, validates for CS relevance, parses, chunks, and embeds a study document.
    Supports PDF, DOCX, PPTX, and TXT (up to 25 MB).
    """
    filename = file.filename or "uploaded_file.pdf"
    content = await file.read()
    file_size = len(content)

    if file_size > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 25MB.",
        )

    # 1. Parse document structure
    try:
        parsed_doc = document_parser.parse_document(content, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse document: {str(e)}",
        )

    # 2. Document Validation Agent (CS Curriculum Check)
    validation_res = validation_agent.validate_document(
        filename=filename,
        full_text=parsed_doc.get("full_text", ""),
        page_count=parsed_doc.get("page_count", 1),
    )

    if not validation_res["is_valid"]:
        return {
            "is_valid": False,
            "filename": filename,
            "relevance_score": validation_res["relevance_score"],
            "detected_subject": validation_res["detected_subject"],
            "rejection_reason": validation_res["rejection_reason"],
            "summary": validation_res["summary"],
        }

    # 3. Chunk Document
    chunks = document_parser.chunk_document(parsed_doc)
    doc_id = str(uuid.uuid4())
    admin_client = get_supabase_admin_client()

    # 4. Insert into public.student_documents
    try:
        doc_record = {
            "id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "file_type": parsed_doc.get("file_type", "pdf"),
            "file_size": file_size,
            "detected_subject": validation_res["detected_subject"],
            "relevance_score": validation_res["relevance_score"],
            "rejection_reason": None,
            "is_valid": True,
            "summary": validation_res["summary"],
            "page_count": parsed_doc.get("page_count", 1),
        }
        admin_client.table("student_documents").insert(doc_record).execute()
    except Exception as e:
        print(f"[DocumentsRoute] Failed to save document record: {e}")
        # Return graceful object even if database hasn't had the migration run yet
        return {
            "id": doc_id,
            "is_valid": True,
            "filename": filename,
            "file_type": parsed_doc.get("file_type", "pdf"),
            "file_size": file_size,
            "detected_subject": validation_res["detected_subject"],
            "relevance_score": validation_res["relevance_score"],
            "page_count": parsed_doc.get("page_count", 1),
            "summary": validation_res["summary"],
            "chunk_count": len(chunks),
            "warning": "Document validated successfully; run doc_learning_migration.sql in Supabase for persistence.",
        }

    # 5. Embed & Store Chunks
    try:
        embedding_service.store_document_chunks(
            document_id=doc_id,
            user_id=user_id,
            chunks=chunks,
        )
    except Exception as e:
        print(f"[DocumentsRoute] Chunk embedding storage note: {e}")

    return {
        "id": doc_id,
        "is_valid": True,
        "filename": filename,
        "file_type": parsed_doc.get("file_type", "pdf"),
        "file_size": file_size,
        "detected_subject": validation_res["detected_subject"],
        "relevance_score": validation_res["relevance_score"],
        "page_count": parsed_doc.get("page_count", 1),
        "summary": validation_res["summary"],
        "chunk_count": len(chunks),
    }


@router.get("/")
async def list_documents(user_id: str = Depends(get_current_user_id)):
    """Lists all validated study documents belonging to the student."""
    admin_client = get_supabase_admin_client()
    try:
        res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        print(f"[DocumentsRoute] List documents warning: {e}")
        return []


@router.get("/{document_id}")
async def get_document(document_id: str, user_id: str = Depends(get_current_user_id)):
    """Retrieves metadata and summary for a specific document."""
    admin_client = get_supabase_admin_client()
    try:
        res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            return res.data
    except Exception as e:
        print(f"[DocumentsRoute] Get document warning: {e}")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Document not found.",
    )


@router.post("/{document_id}/chat")
async def chat_with_document(
    document_id: str,
    payload: DocumentChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Document Tutor Agent: Answers student questions strictly grounded in
    retrieved document chunks with page citations.
    """
    # Fetch doc metadata scoped to the authenticated user
    admin_client = get_supabase_admin_client()
    doc_meta = {}
    try:
        d_res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if d_res.data:
            doc_meta = d_res.data
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    state_input = {
        "intent": "tutor",
        "query": payload.message,
        "document_id": document_id,
        "user_id": user_id,
        "document_meta": doc_meta,
        "retrieved_chunks": [],
        "chat_history": payload.chat_history,
        "extra_params": {},
        "result": {},
    }

    state_output = doc_orchestrator.invoke(state_input)
    return state_output.get("result", {})


@router.post("/{document_id}/summary")
async def get_document_summary(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Summarization Agent: Generates overview, section breakdowns,
    formula sheet with KaTeX, and revision notes.
    """
    admin_client = get_supabase_admin_client()
    doc_meta = {}
    try:
        d_res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if d_res.data:
            doc_meta = d_res.data
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    state_input = {
        "intent": "summary",
        "query": "comprehensive document overview and formulas",
        "document_id": document_id,
        "user_id": user_id,
        "document_meta": doc_meta,
        "retrieved_chunks": [],
        "chat_history": [],
        "extra_params": {},
        "result": {},
    }

    state_output = doc_orchestrator.invoke(state_input)
    return state_output.get("result", {})


@router.post("/{document_id}/questions")
async def generate_document_questions(
    document_id: str,
    payload: QuestionGenRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Question Generation Agent: Generates MCQs, short-answer, and descriptive questions.
    """
    admin_client = get_supabase_admin_client()
    doc_meta = {}
    try:
        d_res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if d_res.data:
            doc_meta = d_res.data
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    state_input = {
        "intent": "question_gen",
        "query": f"exam questions at {payload.difficulty} level",
        "document_id": document_id,
        "user_id": user_id,
        "document_meta": doc_meta,
        "retrieved_chunks": [],
        "chat_history": [],
        "extra_params": {
            "difficulty": payload.difficulty,
            "topic": payload.topic,
        },
        "result": {},
    }

    state_output = doc_orchestrator.invoke(state_input)
    return state_output.get("result", {})


@router.post("/{document_id}/quiz/generate")
async def generate_document_quiz(
    document_id: str,
    payload: QuizGenRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Quiz Agent: Generates interactive diagnostic quiz questions from the document.
    """
    admin_client = get_supabase_admin_client()
    doc_meta = {}
    try:
        d_res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if d_res.data:
            doc_meta = d_res.data
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    state_input = {
        "intent": "quiz_gen",
        "query": "diagnostic assessment quiz",
        "document_id": document_id,
        "user_id": user_id,
        "document_meta": doc_meta,
        "retrieved_chunks": [],
        "chat_history": [],
        "extra_params": {
            "num_questions": payload.num_questions,
        },
        "result": {},
    }

    state_output = doc_orchestrator.invoke(state_input)
    return state_output.get("result", {})


@router.post("/{document_id}/quiz/evaluate")
async def evaluate_document_quiz(
    document_id: str,
    payload: QuizEvaluateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Quiz Agent: Evaluates submitted answers, explains misconceptions, and flags weak topics.
    """
    admin_client = get_supabase_admin_client()
    doc_meta = {}
    try:
        d_res = (
            admin_client.table("student_documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if d_res.data:
            doc_meta = d_res.data
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    state_input = {
        "intent": "quiz_eval",
        "query": "",
        "document_id": document_id,
        "user_id": user_id,
        "document_meta": doc_meta,
        "retrieved_chunks": [],
        "chat_history": [],
        "extra_params": {
            "questions": payload.questions,
            "answers": payload.answers,
        },
        "result": {},
    }

    state_output = doc_orchestrator.invoke(state_input)
    return state_output.get("result", {})


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Deletes a document and cascades deletion of its vector chunks."""
    admin_client = get_supabase_admin_client()
    try:
        res = admin_client.table("student_documents").delete().eq("id", document_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or you do not have permission to delete it.",
            )
        return {"success": True, "message": "Document deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DocumentsRoute] Delete document error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document.",
        )
