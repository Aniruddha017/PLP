from typing import Any, TypedDict
from langgraph.graph import StateGraph, END

from app.services.embedding_service import embedding_service
from app.services.agents.tutor_agent import tutor_agent
from app.services.agents.summary_agent import summary_agent
from app.services.agents.question_gen_agent import question_gen_agent
from app.services.agents.quiz_agent import quiz_agent


class AgentState(TypedDict):
    intent: str
    query: str
    document_id: str
    user_id: str
    document_meta: dict[str, Any]
    retrieved_chunks: list[dict[str, Any]]
    chat_history: list[dict[str, str]]
    extra_params: dict[str, Any]
    result: dict[str, Any]


def router_node(state: AgentState) -> dict[str, Any]:
    """Inspects query or explicit intent to ensure proper routing."""
    intent = state.get("intent", "tutor").lower()
    valid_intents = {"tutor", "summary", "question_gen", "quiz_gen", "quiz_eval"}
    if intent not in valid_intents:
        # Simple heuristic if intent not explicitly given
        q = state.get("query", "").lower()
        if "summar" in q or "overview" in q or "formula" in q:
            intent = "summary"
        elif "question" in q or "mcq" in q or "practice" in q:
            intent = "question_gen"
        elif "quiz" in q or "test me" in q:
            intent = "quiz_gen"
        else:
            intent = "tutor"
    return {"intent": intent}


def retriever_node(state: AgentState) -> dict[str, Any]:
    """Retrieves top grounded chunks from Supabase pgvector."""
    doc_id = state.get("document_id", "")
    user_id = state.get("user_id", "")
    query = state.get("query", "")
    intent = state.get("intent", "tutor")

    # If summary or question gen without specific query, retrieve broader context
    search_query = query if query and query.strip() else "key concepts theorems algorithms"
    limit = 6 if intent in ("summary", "question_gen", "quiz_gen") else 4

    chunks = embedding_service.search_similar_chunks(
        document_id=doc_id,
        user_id=user_id,
        query=search_query,
        match_count=limit,
    )
    return {"retrieved_chunks": chunks}


def tutor_node(state: AgentState) -> dict[str, Any]:
    """Executes the Document Tutor Agent."""
    student_profile = state.get("extra_params", {}).get("student_profile")
    if not student_profile and state.get("user_id"):
        try:
            from app.db.supabase import get_supabase_admin_client
            db = get_supabase_admin_client()
            if db:
                p_res = db.table("profiles").select("preferred_language, explanation_depth, learning_approach").eq("id", state["user_id"]).execute()
                if p_res.data:
                    student_profile = p_res.data[0]
        except Exception:
            pass

    res = tutor_agent.answer_question(
        question=state.get("query", ""),
        document_meta=state.get("document_meta", {}),
        chunks=state.get("retrieved_chunks", []),
        chat_history=state.get("chat_history", []),
        student_profile=student_profile,
    )
    return {"result": res}


def summary_node(state: AgentState) -> dict[str, Any]:
    """Executes the Summarization Agent."""
    res = summary_agent.generate_summary(
        document_meta=state.get("document_meta", {}),
        chunks=state.get("retrieved_chunks", []),
    )
    return {"result": res}


def question_gen_node(state: AgentState) -> dict[str, Any]:
    """Executes the Question Generation Agent."""
    difficulty = state.get("extra_params", {}).get("difficulty", "Medium")
    topic = state.get("extra_params", {}).get("topic")
    res = question_gen_agent.generate_questions(
        document_meta=state.get("document_meta", {}),
        chunks=state.get("retrieved_chunks", []),
        difficulty=difficulty,
        topic_filter=topic,
    )
    return {"result": res}


def quiz_gen_node(state: AgentState) -> dict[str, Any]:
    """Executes the Quiz Generation Agent."""
    num_q = int(state.get("extra_params", {}).get("num_questions", 5))
    questions = quiz_agent.generate_quiz(
        document_meta=state.get("document_meta", {}),
        chunks=state.get("retrieved_chunks", []),
        num_questions=num_q,
    )
    return {"result": {"questions": questions}}


def quiz_eval_node(state: AgentState) -> dict[str, Any]:
    """Executes Quiz Evaluation & Weak Topic Diagnostic."""
    questions = state.get("extra_params", {}).get("questions", [])
    answers = state.get("extra_params", {}).get("answers", {})
    res = quiz_agent.evaluate_quiz(
        questions=questions,
        student_answers=answers,
        document_meta=state.get("document_meta", {}),
    )
    return {"result": res}


# --- Conditional Routing Functions ---
def route_from_router(state: AgentState) -> str:
    intent = state.get("intent", "tutor")
    if intent == "quiz_eval":
        return "quiz_eval"
    return "retriever"


def route_from_retriever(state: AgentState) -> str:
    return state.get("intent", "tutor")


# --- LangGraph Graph Construction ---
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("retriever", retriever_node)
workflow.add_node("tutor", tutor_node)
workflow.add_node("summary", summary_node)
workflow.add_node("question_gen", question_gen_node)
workflow.add_node("quiz_gen", quiz_gen_node)
workflow.add_node("quiz_eval", quiz_eval_node)

workflow.set_entry_point("router")

workflow.add_conditional_edges(
    "router",
    route_from_router,
    {
        "retriever": "retriever",
        "quiz_eval": "quiz_eval",
    },
)

workflow.add_conditional_edges(
    "retriever",
    route_from_retriever,
    {
        "tutor": "tutor",
        "summary": "summary",
        "question_gen": "question_gen",
        "quiz_gen": "quiz_gen",
    },
)

workflow.add_edge("tutor", END)
workflow.add_edge("summary", END)
workflow.add_edge("question_gen", END)
workflow.add_edge("quiz_gen", END)
workflow.add_edge("quiz_eval", END)

doc_orchestrator = workflow.compile()
