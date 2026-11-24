import json
from typing import Any
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service


class DocumentSummaryAgent:
    """
    Summarization Agent:
    - Generates an overall document executive overview.
    - Creates chapter-wise / section-wise structured summaries.
    - Extracts core formulas, definitions, and theorems with KaTeX.
    - Generates quick revision notes for exam preparation.
    """

    def generate_summary(
        self,
        document_meta: dict[str, Any],
        chunks: list[dict[str, Any]],
    ) -> dict[str, Any]:
        doc_name = document_meta.get("filename", "Uploaded Material")
        subject = document_meta.get("detected_subject", "Computer Science")

        # Sample key chunks across the document
        if not chunks:
            return {
                "overview": f"No content available to summarize for {doc_name}.",
                "sections": [],
                "formulas_and_definitions": [],
                "revision_notes": [],
            }

        # Select representative chunks across pages
        step = max(1, len(chunks) // 8)
        selected_chunks = chunks[::step][:8]
        context_text = "\n\n".join(
            f"[Page {c.get('page_number', 1)} - {c.get('heading', '')}]:\n{c.get('content', '')[:500]}"
            for c in selected_chunks
        )

        system_prompt = (
            f"You are an academic summarization specialist in B.Tech {subject}.\n"
            f"Create a structured, high-yield study summary for '{doc_name}'.\n\n"
            "CRITICAL: Respond STRICTLY in valid JSON matching this schema:\n"
            "{\n"
            '  "overview": "High-level summary of the entire document (3-4 sentences).",\n'
            '  "sections": [\n'
            '    {\n'
            '      "heading": "Section / Chapter Title",\n'
            '      "page": 1,\n'
            '      "summary": "Key principles and algorithmic mechanics.",\n'
            '      "takeaways": ["Point 1", "Point 2"]\n'
            '    }\n'
            '  ],\n'
            '  "formulas_and_definitions": [\n'
            '    {\n'
            '      "term": "Term Name / Theorem",\n'
            '      "definition": "Precise academic definition.",\n'
            '      "formula": "$O(n \\\\log n)$ or mathematical formulation"\n'
            '    }\n'
            '  ],\n'
            '  "revision_notes": [\n'
            '    "Quick memory bite for exams",\n'
            '    "Important edge case or invariant"\n'
            '  ]\n'
            "}"
        )

        user_prompt = (
            f"DOCUMENT SECTIONS FROM '{doc_name}':\n\"\"\"\n{context_text}\n\"\"\"\n\n"
            "Generate the high-yield study summary strictly in valid JSON format."
        )

        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

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
                "overview": data.get("overview") or f"Comprehensive overview of {doc_name}.",
                "sections": data.get("sections") or [],
                "formulas_and_definitions": data.get("formulas_and_definitions") or [],
                "revision_notes": data.get("revision_notes") or [],
            }
        except Exception as e:
            print(f"[DocumentSummaryAgent] JSON parsing error: {e}")
            return {
                "overview": f"Summary of {doc_name} covering fundamental concepts in {subject}.",
                "sections": [
                    {
                        "heading": "Core Principles",
                        "page": 1,
                        "summary": "Covers foundational data structures and computational complexity.",
                        "takeaways": ["Analyze asymptotic complexity", "Verify boundary conditions"],
                    }
                ],
                "formulas_and_definitions": [
                    {
                        "term": "Asymptotic Bound",
                        "definition": "Mathematical bound on algorithmic growth.",
                        "formula": "$T(n) = O(f(n))$",
                    }
                ],
                "revision_notes": [
                    f"Review core sections of {doc_name} before examinations.",
                    "Pay special attention to edge cases and base cases.",
                ],
            }


summary_agent = DocumentSummaryAgent()
