from datetime import datetime, timedelta, timezone
from app.db.supabase import get_supabase_admin_client


class MasteryService:
    def update_mastery_from_quiz(
        self,
        user_id: str,
        subject: str,
        topic: str,
        quiz_percentage: int,
    ) -> int:
        """
        Updates student's topic mastery using weighted adaptive calibration
        and schedules next spaced-repetition review date.
        """
        if not user_id:
            return quiz_percentage

        db = get_supabase_admin_client()

        # 1. Fetch current mastery record if available
        current_mastery = 50
        try:
            res = (
                db.table("student_topic_mastery")
                .select("mastery_percentage")
                .eq("user_id", user_id)
                .eq("subject", subject)
                .eq("topic_name", topic)
                .execute()
            )
            if res.data and len(res.data) > 0:
                current_mastery = res.data[0].get("mastery_percentage", 50)
        except Exception as e:
            print(f"[MasteryService] Lookup error: {e}")

        # 2. Adaptive weighting formula: 65% existing knowledge + 35% recent assessment
        new_mastery = int(round(0.65 * current_mastery + 0.35 * quiz_percentage))
        new_mastery = max(0, min(100, new_mastery))

        # 3. Determine mastery status & Spaced-Repetition Review Interval
        if new_mastery >= 90:
            status = "Mastered"
            days_ahead = 7
        elif new_mastery >= 60:
            status = "In Review"
            days_ahead = 3
        else:
            status = "Up Next"
            days_ahead = 1

        next_review = datetime.now(timezone.utc) + timedelta(days=days_ahead)

        # 4. Upsert into Supabase student_topic_mastery
        try:
            db.table("student_topic_mastery").upsert(
                {
                    "user_id": user_id,
                    "subject": subject,
                    "topic_name": topic,
                    "mastery_percentage": new_mastery,
                    "status": status,
                    "next_review_at": next_review.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="user_id,subject,topic_name",
            ).execute()
        except Exception as e:
            print(f"[MasteryService] Failed to upsert topic mastery: {e}")

        return new_mastery


mastery_service = MasteryService()
