import json
from typing import Any
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service


class DocumentValidationAgent:
    """
    Validation Agent for B.Tech Computer Science study materials.
    Evaluates whether the extracted text content belongs to the B.Tech CS curriculum:
    DBMS, DSA, OS, Computer Networks, AI/ML, Compilers, Architecture, Discrete Math, etc.
    Rejects unrelated documents and assigns a relevance score and rejection reason.
    """

    ACCEPTED_DOMAINS = [
        "Data Structures and Algorithms",
        "Database Management Systems",
        "Operating Systems",
        "Computer Networks",
        "Artificial Intelligence & Machine Learning",
        "Computer Organization & Architecture",
        "Theory of Computation & Automata",
        "Compiler Design",
        "Software Engineering",
        "Engineering Mathematics & Discrete Structures",
        "Probability and Statistics",
        "Information Security & Cryptography",
        "Distributed Systems & Cloud Computing",
        "Web Technologies & System Programming",
    ]

    def validate_document(
        self,
        filename: str,
        full_text: str,
        page_count: int,
    ) -> dict[str, Any]:
        if not full_text or len(full_text.strip()) < 30:
            return {
                "is_valid": False,
                "relevance_score": 0.0,
                "detected_subject": "Unknown / Empty Document",
                "rejection_reason": "The document contains insufficient readable text (empty or scanned image without OCR text).",
                "summary": "No text content detected in document.",
            }

        # Sample beginning, middle, and end to form a representative snippet (~3500 chars max)
        text_len = len(full_text)
        if text_len <= 3500:
            sample_text = full_text
        else:
            p1 = full_text[:1500]
            mid_start = text_len // 2 - 500
            p2 = full_text[mid_start : mid_start + 1000]
            p3 = full_text[-1000:]
            sample_text = f"{p1}\n\n[...]\n\n{p2}\n\n[...]\n\n{p3}"

        system_prompt = (
            "You are an academic Dean and Curriculum Auditor for B.Tech Computer Science & Engineering.\n"
            "Your objective: rigorously evaluate whether the uploaded academic material is directly relevant to B.Tech Computer Science courses.\n"
            "Accepted subjects include: " + ", ".join(self.ACCEPTED_DOMAINS) + ".\n\n"
            "REJECT ANY NON-CS OR UNRELATED CONTENT (e.g. general fiction, cooking recipes, celebrity news, biology, music lyrics, financial tax filings, marketing ads).\n"
            "Evaluate actual conceptual content, not just the filename.\n\n"
            "CRITICAL: Respond STRICTLY in valid JSON matching this schema:\n"
            "{\n"
            '  "is_valid": true,\n'
            '  "relevance_score": 0.95,\n'
            '  "detected_subject": "Operating Systems",\n'
            '  "rejection_reason": null,\n'
            '  "summary": "2-3 sentence academic overview of the core concepts covered.",\n'
            '  "topics": ["CPU Scheduling", "Deadlock Prevention", "Virtual Memory"]\n'
            "}\n"
            "Note: If relevance_score < 0.60, set is_valid to false and provide a polite rejection_reason explaining why the document does not qualify as B.Tech CS material."
        )

        user_prompt = (
            f"Filename: '{filename}'\n"
            f"Page Count: {page_count}\n"
            f"Extracted Text Sample:\n\"\"\"\n{sample_text}\n\"\"\"\n\n"
            "Evaluate this document strictly in valid JSON format."
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

            if "is_valid" in data and "relevance_score" in data:
                score = float(data.get("relevance_score", 0.0))
                is_valid = bool(data.get("is_valid", False))
                subject = str(data.get("detected_subject") or "Computer Science")
                reason = data.get("rejection_reason")
                summary = data.get("summary") or f"Academic document on {subject}."

                return {
                    "is_valid": is_valid,
                    "relevance_score": score,
                    "detected_subject": subject,
                    "rejection_reason": reason if not is_valid else None,
                    "summary": summary,
                    "topics": data.get("topics") or [],
                }

            raise ValueError("Incomplete validation schema returned by LLM.")
        except Exception as e:
            print(f"[DocumentValidationAgent] Fallback validation used: {e}")
            # Resilient heuristic fallback
            lower = full_text.lower()
            cs_keywords = [
                "algorithm", "database", "sql", "operating system", "process", "memory",
                "network", "tcp", "ip", "tree", "graph", "sort", "complexity", "big o",
                "machine learning", "neural", "compiler", "cpu", "discrete", "probability"
            ]
            matches = sum(1 for kw in cs_keywords if kw in lower)
            is_cs = matches >= 3
            return {
                "is_valid": is_cs,
                "relevance_score": min(1.0, 0.4 + matches * 0.1) if is_cs else 0.3,
                "detected_subject": "Computer Science (Core)" if is_cs else "Non-CS Content",
                "rejection_reason": None if is_cs else "The document content does not appear to match B.Tech Computer Science topics.",
                "summary": "Computer Science academic notes and reference material." if is_cs else "Unrelated material.",
                "topics": ["Algorithms", "Core CS"] if is_cs else [],
            }


validation_agent = DocumentValidationAgent()
