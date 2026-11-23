import json
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service
from app.db.supabase import get_supabase_admin_client


class RoadmapService:
    def generate_roadmap(
        self,
        subject: str,
        topic: str,
        user_id: str | None = None,
        conversation_id: str | None = None,
    ) -> dict:
        """
        Retrieves or generates a personalized 5-step learning roadmap for a CS topic.
        Caches in public.learning_roadmaps in Supabase.
        """
        # 1. Check existing cached roadmap in Supabase
        if user_id:
            try:
                db = get_supabase_admin_client()
                cached = (
                    db.table("learning_roadmaps")
                    .select("subject, topic, roadmap")
                    .eq("user_id", user_id)
                    .eq("subject", subject)
                    .eq("topic", topic)
                    .execute()
                )
                if cached.data and len(cached.data) > 0:
                    data = cached.data[0]
                    return {
                        "subject": data.get("subject") or subject,
                        "topic": data.get("topic") or topic,
                        "roadmap": data.get("roadmap") or [],
                        "learning_outcome": f"Comprehensive mastery of {topic} through structured progression.",
                    }
            except Exception as e:
                print(f"[RoadmapService] Cache lookup error: {e}")

        # 2. Extract student profile details
        student_level = "Undergraduate Computer Science"
        if user_id:
            try:
                db = get_supabase_admin_client()
                profile_res = (
                    db.table("profiles")
                    .select("year_of_study, learning_goal")
                    .eq("id", user_id)
                    .execute()
                )
                if profile_res.data and len(profile_res.data) > 0:
                    p = profile_res.data[0]
                    year = p.get("year_of_study")
                    if year:
                        student_level = f"Year {year} Computer Science Student"
            except Exception as e:
                print(f"[RoadmapService] Profile lookup error: {e}")

        # 3. Assemble prompt for structured roadmap generation
        system_content = (
            f"You are a premier University Computer Science Curriculum Architect designing a learning pathway for a {student_level}.\n"
            "Create a structured, highly actionable 5-step roadmap to master the given topic.\n"
            "CRITICAL: Respond STRICTLY with valid JSON matching this schema:\n"
            "{\n"
            '  "learning_outcome": "Overall behavioral and conceptual mastery achieved upon completion.",\n'
            '  "steps": [\n'
            '    {\n'
            '      "step": 1,\n'
            '      "title": "Clear step title (e.g. Invariant Fundamentals)",\n'
            '      "description": "2-sentence actionable breakdown of what to study and implement.",\n'
            '      "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],\n'
            '      "estimated_hours": 2.5,\n'
            '      "practice_problem": "Specific coding or mathematical derivation challenge."\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        user_content = f"Generate a 5-step personalized learning roadmap strictly in valid JSON format for Subject: '{subject}' — Topic: '{topic}'."

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
            steps = parsed.get("steps") or []
            outcome = parsed.get("learning_outcome") or f"Mastery of {topic}"

            # 4. Cache generated roadmap in Supabase
            if user_id:
                try:
                    db = get_supabase_admin_client()
                    db.table("learning_roadmaps").upsert({
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                        "subject": subject,
                        "topic": topic,
                        "roadmap": steps,
                    }, on_conflict="user_id,subject,topic").execute()
                except Exception as e:
                    print(f"[RoadmapService] Failed to cache roadmap: {e}")

            return {
                "subject": subject,
                "topic": topic,
                "roadmap": steps,
                "learning_outcome": outcome,
            }
        except Exception as e:
            print(f"[RoadmapService] JSON decode error: {e}")
            fallback_steps = [
                {
                    "step": 1,
                    "title": f"Foundational Principles of {topic}",
                    "description": "Understand core definitions, mathematical representations, and base axioms.",
                    "key_concepts": ["Definitions", "Axioms", "State space"],
                    "estimated_hours": 2.0,
                    "practice_problem": f"Derive the basic formulation for {topic}.",
                },
                {
                    "step": 2,
                    "title": "Algorithmic Implementation & Data Structures",
                    "description": "Implement standard operations and analyze spatial and temporal constraints.",
                    "key_concepts": ["Implementation", "Time Complexity", "Space Complexity"],
                    "estimated_hours": 3.0,
                    "practice_problem": "Write a clean implementation in C++ or Python.",
                },
                {
                    "step": 3,
                    "title": "Optimization & Edge Case Analysis",
                    "description": "Explore adversarial inputs, cache behavior, and asymptotic bottlenecks.",
                    "key_concepts": ["Worst Case Analysis", "Amortization", "Memory Locality"],
                    "estimated_hours": 2.5,
                    "practice_problem": "Profile and benchmark performance under stress.",
                },
                {
                    "step": 4,
                    "title": "Systems Integration & Real-World Use Cases",
                    "description": "Connect theoretical models to operating systems, databases, or distributed architectures.",
                    "key_concepts": ["Distributed state", "Fault tolerance", "Concurrency"],
                    "estimated_hours": 3.0,
                    "practice_problem": "Design an architecture utilizing this concept.",
                },
                {
                    "step": 5,
                    "title": "Mastery Verification & Synthesis",
                    "description": "Solve university exam-level questions and explain concepts from first principles.",
                    "key_concepts": ["Synthesis", "Comparative trade-offs", "Socratic defense"],
                    "estimated_hours": 2.0,
                    "practice_problem": "Complete practice quiz and explain trade-offs to AI Tutor.",
                },
            ]
            return {
                "subject": subject,
                "topic": topic,
                "roadmap": fallback_steps,
                "learning_outcome": f"Step-by-step mastery of {topic}",
            }


roadmap_service = RoadmapService()
