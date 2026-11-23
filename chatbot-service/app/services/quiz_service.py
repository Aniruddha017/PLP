import json
from datetime import datetime, timezone
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service
from app.services.mastery_service import mastery_service
from app.db.supabase import get_supabase_admin_client


class QuizService:
    def generate_quiz(
        self,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
        user_id: str | None = None,
    ) -> list[dict]:
        """
        Generates 4 university-level multiple choice questions on the given topic.
        """
        student_level = "Undergraduate Computer Science"
        if user_id:
            try:
                db = get_supabase_admin_client()
                profile_res = (
                    db.table("profiles")
                    .select("year_of_study")
                    .eq("id", user_id)
                    .execute()
                )
                if profile_res.data and len(profile_res.data) > 0:
                    y = profile_res.data[0].get("year_of_study")
                    if y:
                        student_level = f"Year {y} Computer Science Student"
            except Exception as e:
                print(f"[QuizService] Profile lookup error: {e}")

        system_content = (
            f"You are a Senior Computer Science Professor generating an adaptive diagnostic assessment for a {student_level}.\n"
            f"Difficulty tier: {difficulty}.\n"
            "Create exactly 4 rigorous Multiple Choice Questions (MCQ) testing conceptual depth, algorithm analysis, mathematical bounds, and implementation trade-offs.\n"
            "CRITICAL: Respond STRICTLY in valid JSON matching this schema:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "id": 1,\n'
            '      "question": "Clear, precise problem statement.",\n'
            '      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],\n'
            '      "correct_option_index": 0,\n'
            '      "explanation": "Why this option is correct from first principles.",\n'
            '      "key_formula": "LaTeX formula if applicable, e.g. $O(V + E)$ or $T(n) = O(n \\log n)$"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        user_content = f"Generate 4 MCQ questions for Subject: '{subject}' — Topic: '{topic}' at {difficulty} level."

        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
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
            parsed = json.loads(cleaned.strip())
            return parsed.get("questions") or []
        except Exception as e:
            print(f"[QuizService] JSON parsing error: {e}")
            # Reliable fallback quiz for topic
            return [
                {
                    "id": 1,
                    "question": f"What is the primary computational or theoretical invariant underlying {topic}?",
                    "options": [
                        "Asymptotic efficiency bounded by logarithmic factors",
                        "Strict partitioning of subproblem state spaces",
                        "Preservation of state order across recursive iterations",
                        "Dynamic memory isolation across independent processes",
                    ],
                    "correct_option_index": 1,
                    "explanation": f"The foundational invariant in {topic} centers on structuring subproblem states cleanly.",
                    "key_formula": "$O(n \\log n)$",
                },
                {
                    "id": 2,
                    "question": f"Which asymptotic bound best characterizes the standard implementation of {topic}?",
                    "options": [
                        "$O(1)$ constant time",
                        "$O(\\log n)$ logarithmic time",
                        "$O(n \\log n)$ linearithmic time",
                        "$O(n^2)$ quadratic time in worst case",
                    ],
                    "correct_option_index": 2,
                    "explanation": "Standard balanced executions operate in $O(n \\log n)$ time.",
                    "key_formula": "$T(n) = 2T(n/2) + O(n)$",
                },
                {
                    "id": 3,
                    "question": f"When applying {topic} in practice, which edge case must be prioritized to prevent degradation?",
                    "options": [
                        "Adversarial or already sorted inputs causing recursion collapse",
                        "Zero-length initialization buffers",
                        "Memory page fragmentation across virtual tables",
                        "All of the above depending on input constraints",
                    ],
                    "correct_option_index": 3,
                    "explanation": "Robust implementations address both input ordering and resource constraints.",
                    "key_formula": "$\\Omega(n) \\le T(n) \\le O(n^2)$",
                },
                {
                    "id": 4,
                    "question": f"How does {topic} balance time vs. space complexity trade-offs?",
                    "options": [
                        "Trades auxiliary space to achieve optimal amortized runtimes",
                        "Requires zero extra memory at the cost of exponential steps",
                        "Eliminates stack frames entirely using bitwise registers",
                        "Guarantees linear search bounds across unordered streams",
                    ],
                    "correct_option_index": 0,
                    "explanation": "Auxiliary buffers or recursive call stack frames enable fast partitioned lookups.",
                    "key_formula": "$S(n) = O(n)$",
                },
            ]

    def evaluate_quiz(
        self,
        subject: str,
        topic: str,
        questions: list[dict],
        student_answers: list[dict],
        user_id: str | None = None,
        conversation_id: str | None = None,
    ) -> dict:
        """
        Scores student answers, persists the attempt in public.quiz_attempts,
        and triggers adaptive topic mastery calibration.
        """
        answer_map = {a.get("question_id"): a.get("selected_option_index") for a in student_answers}

        correct_count = 0
        details = []

        for q in questions:
            q_id = q.get("id")
            selected = answer_map.get(q_id)
            correct_idx = q.get("correct_option_index", 0)
            is_correct = selected == correct_idx
            if is_correct:
                correct_count += 1

            details.append({
                "question_id": q_id,
                "question": q.get("question"),
                "selected_option": selected,
                "correct_option": correct_idx,
                "is_correct": is_correct,
                "explanation": q.get("explanation"),
                "formula": q.get("key_formula", ""),
            })

        total = len(questions) or 1
        percentage = int(round((correct_count / total) * 100))

        # Update mastery in database
        new_mastery = mastery_service.update_mastery_from_quiz(
            user_id=user_id or "",
            subject=subject,
            topic=topic,
            quiz_percentage=percentage,
        )

        # Record quiz attempt in Supabase
        if user_id:
            try:
                db = get_supabase_admin_client()
                db.table("quiz_attempts").insert({
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "subject": subject,
                    "topic_name": topic,
                    "questions": details,
                    "score": correct_count,
                    "total": total,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
            except Exception as e:
                print(f"[QuizService] Failed to record quiz attempt: {e}")

        if percentage >= 90:
            summary = f"Outstanding mastery! You answered {correct_count}/{total} correctly ({percentage}%). Topic status advanced."
        elif percentage >= 60:
            summary = f"Solid progress! You scored {correct_count}/{total} ({percentage}%). Review the key formulas below to reinforce gaps."
        else:
            summary = f"Review needed: You scored {correct_count}/{total} ({percentage}%). Review the Socratic explanation with your AI Tutor."

        return {
            "subject": subject,
            "topic": topic,
            "score": correct_count,
            "total": total,
            "percentage": percentage,
            "new_mastery_percentage": new_mastery,
            "feedback_summary": summary,
            "details": details,
        }


quiz_service = QuizService()
