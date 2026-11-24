import json
import uuid
from typing import Any
from groq.types.chat import ChatCompletionMessageParam

from app.db.supabase import get_supabase_admin_client
from app.services.llm_service import llm_service


# Curated curriculum fallback mapping by year
CURRICULUM_BY_YEAR = {
    1: [
        {"name": "Programming Fundamentals (C/C++)", "topics": ["Pointers & Memory", "Recursion", "Bitwise Manipulation", "Dynamic Memory Allocation", "File I/O"]},
        {"name": "Discrete Mathematics", "topics": ["Propositional Logic", "Set Theory & Relations", "Combinatorics", "Graph Theory Fundamentals", "Recurrence Relations"]},
        {"name": "Digital Logic & Computer Organization", "topics": ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits & Flip Flops", "Registers & Counters", "ALU Architecture"]},
    ],
    2: [
        {"name": "Data Structures & Algorithms", "topics": ["Binary Search Trees & AVL", "Graph Traversals (BFS/DFS)", "Dynamic Programming", "Greedy Algorithms", "Sorting & Asymptotics"]},
        {"name": "Object-Oriented Programming (Java/C++)", "topics": ["Polymorphism & Inheritance", "Generics & Collections", "Exception Handling", "Design Patterns", "Multithreading Basics"]},
        {"name": "Computer Architecture & Organization", "topics": ["Instruction Set Architecture (RISC/CISC)", "Pipelining & Hazards", "Cache Memory & Virtual Memory", "I/O Organization", "Buses & Timing"]},
    ],
    3: [
        {"name": "Operating Systems", "topics": ["Process Scheduling", "Deadlock Detection & Prevention", "Memory Management & Paging", "Virtual Memory & Page Replacement", "File Systems & Disk Scheduling"]},
        {"name": "Database Management Systems (DBMS)", "topics": ["Relational Algebra & SQL", "ER Modeling & Normalization", "Transactions & ACID Properties", "Concurrency Control", "Indexing & B+ Trees"]},
        {"name": "Computer Networks", "topics": ["OSI & TCP/IP Reference Models", "Data Link Layer & Framing", "Network Layer & IP Addressing", "Routing Protocols (OSPF/BGP)", "Transport Layer (TCP/UDP)"]},
    ],
    4: [
        {"name": "Artificial Intelligence & Machine Learning", "topics": ["Search Algorithms (A*, Minimax)", "Supervised Learning (Regression/Classification)", "Neural Networks & Backpropagation", "Model Evaluation & Metrics", "Ensemble Methods"]},
        {"name": "Compiler Design", "topics": ["Lexical Analysis & Regular Expressions", "Syntax Analysis & LL/LR Parsing", "Syntax-Directed Translation", "Intermediate Code Generation", "Code Optimization & Generation"]},
        {"name": "Software Engineering & System Design", "topics": ["Software Development Lifecycles (Agile/Scrum)", "System Architecture & Scalability", "Microservices vs Monoliths", "Load Balancing & Caching", "API Design & Documentation"]},
    ],
}


class TimetableService:
    def _get_student_profile(self, user_id: str) -> dict[str, Any]:
        """Fetches comprehensive student profile from Supabase."""
        admin_client = get_supabase_admin_client()
        try:
            res = admin_client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
            return res.data or {}
        except Exception as e:
            print(f"[TimetableService] Error fetching profile: {e}")
            return {}

    def _get_student_mastery(self, user_id: str) -> list[dict[str, Any]]:
        """Fetches topic mastery records to prioritize weak topics."""
        admin_client = get_supabase_admin_client()
        try:
            res = admin_client.table("student_topic_mastery").select("*").eq("user_id", user_id).execute()
            return res.data or []
        except Exception as e:
            print(f"[TimetableService] Error fetching mastery: {e}")
            return []

    def _get_recent_quizzes(self, user_id: str) -> list[dict[str, Any]]:
        """Fetches recent quiz attempts to calibrate difficulty and priorities."""
        admin_client = get_supabase_admin_client()
        try:
            res = (
                admin_client.table("quiz_attempts")
                .select("subject, topic_name, score, total, completed_at")
                .eq("user_id", user_id)
                .order("completed_at", desc=True)
                .limit(5)
                .execute()
            )
            return res.data or []
        except Exception as e:
            print(f"[TimetableService] Error fetching quizzes: {e}")
            return []

    def generate_timetable(
        self,
        user_id: str,
        title: str | None = None,
        focus_subjects: list[str] | None = None,
        target_exam_date: str | None = None,
    ) -> dict[str, Any]:
        """
        AI-powered generator constructing a personalized weekly timetable.
        Integrates onboarding profile, curriculum, mastery scores, and time budget.
        """
        profile = self._get_student_profile(user_id)
        mastery = self._get_student_mastery(user_id)
        quizzes = self._get_recent_quizzes(user_id)

        year = int(profile.get("year_of_study") or 2)
        semester = int(profile.get("semester") or (year * 2))
        branch = profile.get("branch") or "Computer Science & Engineering (CSE)"
        college = profile.get("college_name") or "Engineering College"
        proficiency = profile.get("programming_proficiency") or "Intermediate"
        approach = profile.get("learning_approach") or "Step-by-step explanations"
        depth = profile.get("explanation_depth") or "Balanced"
        language = profile.get("preferred_language") or "English"
        daily_time_str = profile.get("daily_learning_time") or "1-2 hours / day"
        primary_goals = profile.get("primary_goals") or ["University Examinations", "Campus Placements & Interviews"]
        subjects_of_interest = focus_subjects or profile.get("subjects_of_interest") or ["Data Structures & Algorithms", "Operating Systems"]
        weak_subjects = profile.get("weak_subjects") or ["Computer Networks"]

        # Parse approximate hours per day
        hours_per_day = 2.0
        if "30-45" in daily_time_str:
            hours_per_day = 1.0
        elif "1-2" in daily_time_str:
            hours_per_day = 2.0
        elif "2-3" in daily_time_str:
            hours_per_day = 3.0
        elif "4+" in daily_time_str:
            hours_per_day = 4.5

        # Curriculum pool
        year_subjects = CURRICULUM_BY_YEAR.get(year, CURRICULUM_BY_YEAR[2])
        curriculum_summary = [
            f"- {s['name']}: {', '.join(s['topics'])}" for s in year_subjects
        ]

        # Mastery summary
        weak_topics = [m['topic_name'] for m in mastery if m.get('mastery_percentage', 0) < 60]
        review_topics = [m['topic_name'] for m in mastery if m.get('status') == 'In Review']

        generation_context = {
            "year_of_study": year,
            "semester": semester,
            "branch": branch,
            "college_name": college,
            "programming_proficiency": proficiency,
            "learning_approach": approach,
            "explanation_depth": depth,
            "preferred_language": language,
            "daily_learning_time": daily_time_str,
            "hours_per_day": hours_per_day,
            "primary_goals": primary_goals,
            "subjects_of_interest": subjects_of_interest,
            "weak_subjects": weak_subjects,
            "weak_topics_count": len(weak_topics),
        }

        timetable_title = title or f"Year {year} Sem {semester} Study Timetable"

        # Assemble LLM prompt
        system_prompt = (
            f"You are an elite Academic Dean and AI Learning Strategist for an undergraduate B.Tech engineering student.\n"
            f"Design a high-yield, realistic, Monday-through-Saturday weekly study timetable tailored to this exact student.\n\n"
            f"STUDENT PROFILE:\n"
            f"- College: {college} | Branch: {branch}\n"
            f"- Year of Study: Year {year} (Semester {semester})\n"
            f"- Programming Proficiency: {proficiency}\n"
            f"- Learning Style: {approach} (Depth: {depth})\n"
            f"- Explanation Language: {language}\n"
            f"- Target Daily Study Time: {daily_time_str} (~{hours_per_day} hours/day)\n"
            f"- Primary Goals: {', '.join(primary_goals)}\n"
            f"- High-Interest Subjects: {', '.join(subjects_of_interest)}\n"
            f"- Priority Weak Subjects (give 1.5x - 2x focus): {', '.join(weak_subjects)}\n\n"
            f"CURRICULUM MODULES:\n" + "\n".join(curriculum_summary) + "\n\n"
            f"WEAK TOPICS IDENTIFIED: {', '.join(weak_topics[:6]) if weak_topics else 'General curriculum baseline'}\n"
            f"SPACED REVIEWS DUE: {', '.join(review_topics[:4]) if review_topics else 'Standard interval reviews'}\n\n"
            f"SCHEDULING RULES:\n"
            f"1. Generate 6 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday (Sunday is rest/buffer).\n"
            f"2. Each day must contain 2 to 4 structured slots fitting into the student's ~{hours_per_day}h target.\n"
            f"3. Slot types MUST be one of: 'study', 'practice', 'review', 'quiz', 'break'.\n"
            f"4. Slot priorities MUST be one of: 'high', 'medium', 'low'.\n"
            f"5. Include short 15-min breaks between intensive sessions.\n"
            f"6. Assign actionable notes to each slot referencing practical concepts, algorithms, or formulas.\n\n"
            f"CRITICAL: Output STRICTLY valid JSON with this exact schema:\n"
            f"{{\n"
            f'  "title": "{timetable_title}",\n'
            f'  "weekly_summary": "1-2 sentence pedagogical summary of this week\'s focus.",\n'
            f'  "schedule": [\n'
            f'    {{\n'
            f'      "day": "Monday",\n'
            f'      "slots": [\n'
            f'        {{\n'
            f'          "id": "mon-1",\n'
            f'          "start_time": "18:00",\n'
            f'          "end_time": "19:00",\n'
            f'          "subject": "Data Structures & Algorithms",\n'
            f'          "topic": "AVL Trees & Rotations",\n'
            f'          "type": "study",\n'
            f'          "priority": "high",\n'
            f'          "notes": "Derive single and double rotations with balancing factors."\n'
            f'        }}\n'
            f'      ]\n'
            f'    }}\n'
            f'  ]\n'
            f"}}"
        )

        user_prompt = f"Construct the personalized weekly study timetable for {timetable_title}."

        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        raw_output = llm_service.generate_response(messages, json_mode=True)
        schedule = []

        try:
            cleaned = raw_output.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())
            schedule = parsed.get("schedule") or []
            if parsed.get("title"):
                timetable_title = parsed["title"]
        except Exception as e:
            print(f"[TimetableService] Error decoding LLM JSON: {e}, using algorithmic fallback")
            schedule = self._generate_algorithmic_fallback(
                year_subjects=year_subjects,
                weak_subjects=weak_subjects,
                subjects_of_interest=subjects_of_interest,
                hours_per_day=hours_per_day,
            )

        if not schedule:
            schedule = self._generate_algorithmic_fallback(
                year_subjects=year_subjects,
                weak_subjects=weak_subjects,
                subjects_of_interest=subjects_of_interest,
                hours_per_day=hours_per_day,
            )

        # Deactivate previous active timetables for user
        admin_client = get_supabase_admin_client()
        try:
            admin_client.table("student_timetables").update({"is_active": False}).eq("user_id", user_id).execute()
        except Exception as e:
            print(f"[TimetableService] Deactivate previous error: {e}")

        # Save new active timetable
        new_id = str(uuid.uuid4())
        record = {
            "id": new_id,
            "user_id": user_id,
            "title": timetable_title,
            "schedule": schedule,
            "generation_context": generation_context,
            "is_active": True,
        }

        try:
            admin_client.table("student_timetables").insert(record).execute()
        except Exception as e:
            print(f"[TimetableService] Error inserting timetable: {e}")

        return record

    def _generate_algorithmic_fallback(
        self,
        year_subjects: list[dict[str, Any]],
        weak_subjects: list[str],
        subjects_of_interest: list[str],
        hours_per_day: float,
    ) -> list[dict[str, Any]]:
        """Intelligent deterministic timetable generator if LLM is offline."""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        all_subject_names = [s["name"] for s in year_subjects]

        # Prioritize weak and interest subjects
        priority_list = [s for s in weak_subjects if s in all_subject_names]
        for s in subjects_of_interest:
            if s in all_subject_names and s not in priority_list:
                priority_list.append(s)
        for s in all_subject_names:
            if s not in priority_list:
                priority_list.append(s)

        if not priority_list:
            priority_list = ["Data Structures & Algorithms", "Operating Systems", "Computer Networks"]

        day_schedules = []
        for d_idx, day_name in enumerate(days):
            sub1 = priority_list[d_idx % len(priority_list)]
            sub2 = priority_list[(d_idx + 1) % len(priority_list)]

            # Topics matching
            topics1 = next((s["topics"] for s in year_subjects if s["name"] == sub1), ["Core Fundamentals", "Problem Solving"])
            topics2 = next((s["topics"] for s in year_subjects if s["name"] == sub2), ["System Design", "Exam Synthesis"])

            t1 = topics1[d_idx % len(topics1)]
            t2 = topics2[(d_idx + 1) % len(topics2)]

            slots = []
            if hours_per_day <= 1.5:
                slots.append({
                    "id": f"{day_name[:3].lower()}-1",
                    "start_time": "18:00",
                    "end_time": "19:00",
                    "subject": sub1,
                    "topic": t1,
                    "type": "study" if d_idx % 2 == 0 else "practice",
                    "priority": "high" if sub1 in weak_subjects else "medium",
                    "notes": f"Master {t1} through guided Socratic derivation and code.",
                })
            else:
                slots.append({
                    "id": f"{day_name[:3].lower()}-1",
                    "start_time": "17:30",
                    "end_time": "18:45",
                    "subject": sub1,
                    "topic": t1,
                    "type": "study",
                    "priority": "high" if sub1 in weak_subjects else "medium",
                    "notes": f"Deep theoretical breakdown of {t1}.",
                })
                slots.append({
                    "id": f"{day_name[:3].lower()}-2",
                    "start_time": "18:45",
                    "end_time": "19:00",
                    "subject": "Quick Rest",
                    "topic": "Cognitive Reset",
                    "type": "break",
                    "priority": "low",
                    "notes": "Hydrate and rest eyes before practice.",
                })
                slots.append({
                    "id": f"{day_name[:3].lower()}-3",
                    "start_time": "19:00",
                    "end_time": "20:00",
                    "subject": sub2,
                    "topic": t2,
                    "type": "quiz" if d_idx in (2, 5) else "practice",
                    "priority": "high" if sub2 in weak_subjects else "medium",
                    "notes": f"Solve practical scenarios and test mastery on {t2}.",
                })

            day_schedules.append({
                "day": day_name,
                "slots": slots,
            })

        return day_schedules

    def get_active_timetable(self, user_id: str) -> dict[str, Any] | None:
        """Retrieves the active timetable for a student."""
        admin_client = get_supabase_admin_client()
        try:
            res = (
                admin_client.table("student_timetables")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
            # Fallback to latest timetable if none is explicitly active
            fallback_res = (
                admin_client.table("student_timetables")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if fallback_res.data and len(fallback_res.data) > 0:
                return fallback_res.data[0]
            return None
        except Exception as e:
            print(f"[TimetableService] Error getting active timetable: {e}")
            return None

    def list_timetables(self, user_id: str) -> list[dict[str, Any]]:
        """Lists all saved timetables for a student."""
        admin_client = get_supabase_admin_client()
        try:
            res = (
                admin_client.table("student_timetables")
                .select("id, title, is_active, created_at, updated_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as e:
            print(f"[TimetableService] Error listing timetables: {e}")
            return []

    def update_timetable(self, timetable_id: str, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Updates slot arrangements or active flag for a student's timetable."""
        admin_client = get_supabase_admin_client()
        update_data = {}
        if "title" in payload and payload["title"] is not None:
            update_data["title"] = payload["title"]
        if "schedule" in payload and payload["schedule"] is not None:
            update_data["schedule"] = payload["schedule"]
        if "is_active" in payload and payload["is_active"] is not None:
            update_data["is_active"] = payload["is_active"]
            if payload["is_active"]:
                # Deactivate others
                admin_client.table("student_timetables").update({"is_active": False}).eq("user_id", user_id).execute()

        res = (
            admin_client.table("student_timetables")
            .update(update_data)
            .eq("id", timetable_id)
            .eq("user_id", user_id)
            .execute()
        )
        return res.data[0] if res.data else {}

    def delete_timetable(self, timetable_id: str, user_id: str) -> bool:
        """Deletes a student's timetable."""
        admin_client = get_supabase_admin_client()
        res = (
            admin_client.table("student_timetables")
            .delete()
            .eq("id", timetable_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(res.data)


timetable_service = TimetableService()
