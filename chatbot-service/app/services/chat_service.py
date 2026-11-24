import json
from groq.types.chat import ChatCompletionMessageParam
from app.services.llm_service import llm_service
from app.db.supabase import get_supabase_admin_client


class ChatService:
    def generate_response(
        self,
        user_message: str,
        conversation_id: str | None = None,
        user_id: str | None = None,
    ) -> dict:
        """
        Generates a personalized Socratic tutor response with structured cards and insights.
        If conversation_id is provided, loads the subject, topic, student learning goal,
        year of study, and past chat history from Supabase to provide continuity and context.
        """
        system_content = (
            "You are an expert AI University Computer Science & Engineering Tutor. "
            "Adopt an encouraging, rigorous Socratic teaching method. "
            "Explain concepts clearly from first principles, using mathematical formulas (in LaTeX format like $O(n \\log n)$ or $\\int f(x)dx$) "
            "and code/pseudo-code where helpful.\n\n"
            "CRITICAL: You MUST respond strictly in valid JSON matching this exact structure:\n"
            "{\n"
            '  "message": "Clear Socratic explanation in markdown, highlighting key definitions, intuition, and principles.",\n'
            '  "cards": [\n'
            '    {\n'
            '      "title": "Short title (e.g. Best Case or Mathematical Definition)",\n'
            '      "description": "Succinct 1-2 sentence explanation.",\n'
            '      "formula": "LaTeX formula or mathematical invariant (e.g. T(n) = 2T(n/2) + O(n))"\n'
            '    }\n'
            '  ],\n'
            '  "key_insight": "A single, memorable high-yield takeaway summarizing the concept.",\n'
            '  "follow_up_question": "A thought-provoking Socratic question prompting the student to test their understanding."\n'
            "}\n"
            "Provide 1 or 2 high-value comparison/concept cards whenever the topic involves algorithms, data structures, mathematics, or systems architecture."
        )

        history_messages: list[ChatCompletionMessageParam] = []

        # 1. Fetch Subject, Topic, and Chat History from Supabase if conversation_id exists
        if conversation_id:
            try:
                db = get_supabase_admin_client()

                # A. Retrieve conversation title, subject, and topic
                conv_res = (
                    db.table("conversations")
                    .select("title, subject, topic")
                    .eq("id", conversation_id)
                    .execute()
                )
                if conv_res.data and len(conv_res.data) > 0:
                    conv = conv_res.data[0]
                    subject = conv.get("subject") or "Computer Science"
                    topic = conv.get("topic") or conv.get("title") or "General Inquiry"
                    system_content += f"\n\nCurrent Subject: {subject}\nCurrent Topic: {topic}"

                # B. Retrieve student profile details if user_id is provided
                if user_id:
                    profile_res = (
                        db.table("profiles")
                        .select("full_name, learning_goal, year_of_study, college_name, branch, semester, programming_proficiency, learning_approach, explanation_depth, preferred_language, primary_goals, subjects_of_interest, weak_subjects, daily_learning_time")
                        .eq("id", user_id)
                        .execute()
                    )
                    if profile_res.data and len(profile_res.data) > 0:
                        profile = profile_res.data[0]
                        name = profile.get("full_name") or "Student"
                        goal = profile.get("learning_goal")
                        year = profile.get("year_of_study")
                        college = profile.get("college_name")
                        branch = profile.get("branch")
                        semester = profile.get("semester")
                        proficiency = profile.get("programming_proficiency")
                        approach = profile.get("learning_approach")
                        depth = profile.get("explanation_depth")
                        language = profile.get("preferred_language")
                        primary_goals = profile.get("primary_goals") or []
                        weak_subjects = profile.get("weak_subjects") or []

                        system_content += f"\n\n--- STUDENT ACADEMIC PROFILE & PERSONALIZATION ---"
                        system_content += f"\nStudent Name: {name}"
                        if college:
                            system_content += f"\nCollege/University: {college}"
                        if branch:
                            system_content += f"\nBranch/Department: {branch}"
                        if year:
                            year_labels = {
                                1: "1st Year (Freshman Fundamentals)",
                                2: "2nd Year (Core Data Structures & Algorithms)",
                                3: "3rd Year (Systems, Networks, OS, DB)",
                                4: "4th Year (Advanced/Capstone/Distributed Systems)"
                            }
                            system_content += f"\nYear of Study: Year {year} - {year_labels.get(year, 'Undergraduate')}"
                        if semester:
                            system_content += f"\nCurrent Semester: Semester {semester}"

                        if proficiency:
                            system_content += f"\nProgramming Proficiency: {proficiency} (Calibrate technical complexity and code implementation explanations accordingly)"
                        if depth:
                            system_content += f"\nPreferred Explanation Depth: {depth}"
                        if approach:
                            system_content += f"\nPreferred Learning Approach: {approach} (Structure answers using this style, e.g. concrete code examples, visual flow, or step-by-step logic)"
                        if primary_goals and len(primary_goals) > 0:
                            goals_str = ", ".join(primary_goals) if isinstance(primary_goals, list) else str(primary_goals)
                            system_content += f"\nPrimary Student Goals: {goals_str} (Highlight patterns, exam questions, or interview applications relevant to these goals)"
                        if weak_subjects and len(weak_subjects) > 0:
                            weak_str = ", ".join(weak_subjects) if isinstance(weak_subjects, list) else str(weak_subjects)
                            system_content += f"\nAreas Needing Improvement: {weak_str} (Provide extra scaffolding, foundational analogies, and step-by-step clarity if topic touches these areas)"

                        if language and str(language).lower() in ("hinglish", "hindi"):
                            if str(language).lower() == "hinglish":
                                system_content += (
                                    "\nPreferred Language: Hinglish. Respond in natural, conversational Hinglish "
                                    "(a warm blend of Hindi and English natural to Indian engineering students, e.g. 'Jaise ki hum jante hain...'). "
                                    "CRITICAL: Keep all computer science terms, code keywords, variable names, and mathematical formulas in standard English."
                                )
                            else:
                                system_content += (
                                    "\nPreferred Language: Hindi. Respond in clear Hindi, keeping code, formulas, and technical keywords in standard English."
                                )
                        elif language:
                            system_content += f"\nPreferred Language: {language}"
                        if goal:
                            system_content += f"\nSpecific Learning Goal: {goal}"

                # C. Retrieve the last 8 messages in this thread for conversational memory
                msg_res = (
                    db.table("messages")
                    .select("role, content")
                    .eq("conversation_id", conversation_id)
                    .order("created_at", desc=False)
                    .limit(8)
                    .execute()
                )

                if msg_res.data:
                    for m in msg_res.data:
                        role = m.get("role")
                        content = m.get("content")
                        if role in ("user", "assistant", "system") and content:
                            history_messages.append({"role": role, "content": content})
            except Exception as e:
                print(f"[ChatService] Could not retrieve Supabase context: {e}")

        # Assemble prompt sequence: System -> History -> Current Prompt
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_content},
            *history_messages,
            {"role": "user", "content": user_message},
        ]

        raw_output = llm_service.generate_response(messages, json_mode=True)

        # Parse JSON output safely
        try:
            # Handle potential markdown code fencing in raw response
            cleaned_output = raw_output.strip()
            if cleaned_output.startswith("```json"):
                cleaned_output = cleaned_output[7:]
            if cleaned_output.startswith("```"):
                cleaned_output = cleaned_output[3:]
            if cleaned_output.endswith("```"):
                cleaned_output = cleaned_output[:-3]
            cleaned_output = cleaned_output.strip()

            parsed = json.loads(cleaned_output)
            return {
                "message": parsed.get("message") or "I've analyzed your question.",
                "cards": parsed.get("cards") or [],
                "key_insight": parsed.get("key_insight"),
                "follow_up_question": parsed.get("follow_up_question"),
            }
        except Exception as e:
            print(f"[ChatService] JSON parsing error on model output: {e}")
            return {
                "message": raw_output,
                "cards": [],
                "key_insight": None,
                "follow_up_question": None,
            }


chat_service = ChatService()
