import json
from typing import Any
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service


class DocumentTutorAgent:
    """
    Document Tutor Agent:
    - Answers student doubts grounded strictly in the retrieved document chunks.
    - Employs beginner-friendly, pedagogical explanations with concrete examples.
    - Explicitly cites page and section references.
    - Avoids hallucination or unsupported assertions.
    - Emits structured cards with KaTeX formulas and Socratic follow-up questions.
    """

    def answer_question(
        self,
        question: str,
        document_meta: dict[str, Any],
        chunks: list[dict[str, Any]],
        chat_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        doc_name = document_meta.get("filename", "Uploaded Document")
        subject = document_meta.get("detected_subject", "Computer Science")

        if not chunks:
            return {
                "answer": (
                    f"I couldn't locate specific sections in **{doc_name}** that address your question. "
                    "Please verify if this concept is covered in the uploaded material, or try asking about related topics."
                ),
                "citations": [],
                "cards": [],
                "key_insight": "Grounded learning requires verifying statements against course materials.",
                "follow_up_questions": [
                    f"What specific section or chapter of {doc_name} should we look at?",
                    "Would you like an overview of the topics found in this document?"
                ],
                "grounded": False,
            }

        # Build citations & formatted context block
        context_blocks = []
        citations_list = []
        for c in chunks:
            page = c.get("page_number", 1)
            heading = c.get("heading", f"Page {page}")
            content = c.get("content", "").strip()
            context_blocks.append(f"--- [Citation: Page {page} | Section: {heading}] ---\n{content}")
            citations_list.append({
                "page_number": page,
                "heading": heading,
                "snippet": content[:180] + "..." if len(content) > 180 else content,
            })

        grounded_context = "\n\n".join(context_blocks)

        system_prompt = (
            f"You are an empathetic, world-class University Professor and AI Tutor specializing in {subject}.\n"
            f"You are tutoring a student using their uploaded course document: '{doc_name}'.\n\n"
            "STRICT GROUNDING RULES:\n"
            "1. Base your explanations on the provided document citations below.\n"
            "2. Whenever stating a fact, theorem, or algorithm property, explicitly cite the page (e.g. '[Page 4, §B-Tree]').\n"
            "3. Explain complex computational and mathematical ideas in intuitive, step-by-step language with examples.\n"
            "4. If the provided document does NOT contain enough context to answer, state this honestly instead of inventing details.\n"
            "5. Format mathematical equations cleanly using LaTeX syntax ($...$ or $$...$$).\n\n"
            "CRITICAL: Respond STRICTLY in valid JSON matching this schema:\n"
            "{\n"
            '  "answer": "Comprehensive, encouraging, step-by-step explanation referencing page citations.",\n'
            '  "cards": [\n'
            '    {\n'
            '      "title": "Concept Name",\n'
            '      "description": "Clear first-principles breakdown.",\n'
            '      "formula": "$T(n) = 2T(n/2) + O(n)$"\n'
            '    }\n'
            '  ],\n'
            '  "key_insight": "One memorable takeaway from this document.",\n'
            '  "follow_up_questions": [\n'
            '    "Socratic thought-provoking question to test understanding?",\n'
            '    "Edge case or implementation question?"\n'
            '  ]\n'
            "}"
        )

        user_prompt = (
            f"DOCUMENT CITATIONS:\n\"\"\"\n{grounded_context}\n\"\"\"\n\n"
            f"STUDENT QUESTION:\n{question}\n\n"
            "Provide your pedagogical explanation strictly in valid JSON format."
        )

        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_prompt},
        ]

        # Append recent conversation history if provided
        if chat_history:
            for item in chat_history[-4:]:
                role = "user" if item.get("role") == "user" else "assistant"
                messages.append({"role": role, "content": item.get("content", "")})

        messages.append({"role": "user", "content": user_prompt})

        raw_output = llm_service.generate_response(messages, json_mode=True)

        try:
            cleaned = raw_output.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())

            return {
                "answer": data.get("answer") or "Here is the explanation based on your document.",
                "citations": citations_list,
                "cards": data.get("cards") or [],
                "key_insight": data.get("key_insight"),
                "follow_up_questions": data.get("follow_up_questions") or [],
                "grounded": True,
            }
        except Exception as e:
            print(f"[DocumentTutorAgent] JSON parsing error: {e}")
            return {
                "answer": (
                    f"Based on **{doc_name}** ([Page {chunks[0].get('page_number', 1)}]):\n\n"
                    f"{chunks[0].get('content', '')[:600]}\n\n"
                    "Let's break down this concept step-by-step together."
                ),
                "citations": citations_list,
                "cards": [],
                "key_insight": "Mastering the fundamentals enables solving higher-order computational problems.",
                "follow_up_questions": ["Would you like to walk through a concrete example together?"],
                "grounded": True,
            }


tutor_agent = DocumentTutorAgent()
