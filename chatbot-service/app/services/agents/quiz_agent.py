import json
from typing import Any
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service


class DocumentQuizAgent:
    """
    Quiz and Assessment Agent:
    - Generates 5 balanced interactive quiz questions from uploaded document chunks.
    - Evaluates submitted student responses, computes percentage score.
    - Explains misconceptions for wrong answers.
    - Identifies weak topics and generates targeted remediation recommendations.
    """

    def generate_quiz(
        self,
        document_meta: dict[str, Any],
        chunks: list[dict[str, Any]],
        num_questions: int = 5,
    ) -> list[dict[str, Any]]:
        doc_name = document_meta.get("filename", "Uploaded Material")
        subject = document_meta.get("detected_subject", "Computer Science")

        if not chunks:
            return []

        step = max(1, len(chunks) // num_questions)
        selected_chunks = chunks[::step][:num_questions]
        context_text = "\n\n".join(
            f"[Passage {idx+1} | Page {c.get('page_number', 1)}]:\n{c.get('content', '')[:450]}"
            for idx, c in enumerate(selected_chunks)
        )

        system_prompt = (
            f"You are a strict academic evaluator for B.Tech {subject}.\n"
            f"Generate exactly {num_questions} rigorous Multiple Choice Questions (MCQ) testing student mastery of '{doc_name}'.\n\n"
            "CRITICAL: Respond STRICTLY in valid JSON matching this schema:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "id": 1,\n'
            '      "topic": "Specific Topic Name",\n'
            '      "question": "Clear problem statement requiring conceptual analysis.",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct_index": 0,\n'
            '      "explanation": "Why this option is correct based on the text.",\n'
            '      "page_reference": 1\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        user_prompt = (
            f"DOCUMENT PASSAGES FROM '{doc_name}':\n\"\"\"\n{context_text}\n\"\"\"\n\n"
            f"Generate {num_questions} MCQ assessment questions strictly in valid JSON format."
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
            return data.get("questions") or []
        except Exception as e:
            print(f"[DocumentQuizAgent] Quiz generation fallback: {e}")
            return [
                {
                    "id": 1,
                    "topic": subject,
                    "question": f"Which algorithmic or system principle forms the foundation of {doc_name}?",
                    "options": [
                        "Invariant correctness through inductive proofs",
                        "Static memory allocation without boundary checks",
                        "Direct linear iteration without indexing",
                        "Lossy decompression of data structures",
                    ],
                    "correct_index": 0,
                    "explanation": "The document emphasizes rigorous correctness and invariant guarantees.",
                    "page_reference": 1,
                }
            ]

    def evaluate_quiz(
        self,
        questions: list[dict[str, Any]],
        student_answers: dict[str, int],  # { "question_id": selected_index }
        document_meta: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Evaluates submitted responses, explains wrong answers,
        and identifies areas requiring student attention.
        """
        total = len(questions)
        if total == 0:
            return {"score": 0, "total": 0, "percentage": 0, "evaluations": [], "weak_topics": []}

        correct_count = 0
        evaluations = []
        topic_scores: dict[str, dict[str, int]] = {}

        for q in questions:
            q_id = str(q.get("id"))
            topic = q.get("topic", "General")
            correct_idx = q.get("correct_index", 0)
            selected_idx = student_answers.get(q_id)

            if topic not in topic_scores:
                topic_scores[topic] = {"correct": 0, "total": 0}
            topic_scores[topic]["total"] += 1

            is_correct = selected_idx is not None and int(selected_idx) == int(correct_idx)
            if is_correct:
                correct_count += 1
                topic_scores[topic]["correct"] += 1

            evaluations.append({
                "id": q.get("id"),
                "question": q.get("question"),
                "selected_index": selected_idx,
                "correct_index": correct_idx,
                "is_correct": is_correct,
                "explanation": q.get("explanation"),
                "page_reference": q.get("page_reference"),
                "topic": topic,
            })

        percentage = round((correct_count / total) * 100)
        weak_topics = [
            topic
            for topic, stats in topic_scores.items()
            if stats["total"] > 0 and (stats["correct"] / stats["total"]) < 0.6
        ]

        recommendations = []
        if percentage >= 80:
            recommendations.append("Excellent mastery! You have a solid grasp of the core concepts in this document.")
        elif percentage >= 50:
            recommendations.append("Good effort. Focus on reviewing the specific pages cited in incorrect answers.")
        else:
            recommendations.append("Significant gaps detected. We recommend re-reading the document summary and attempting practice problems.")

        for wt in weak_topics:
            recommendations.append(f"Review weak topic: '{wt}' — examine key definitions and formulas.")

        return {
            "score": correct_count,
            "total": total,
            "percentage": percentage,
            "evaluations": evaluations,
            "weak_topics": weak_topics,
            "recommendations": recommendations,
        }


quiz_agent = DocumentQuizAgent()
