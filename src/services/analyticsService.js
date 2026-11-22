import { supabase } from '../utils/supabase';

export const analyticsService = {
  /**
   * Fetches comprehensive analytics for the student progress dashboard.
   */
  async getStudentAnalytics(userId) {
    if (!userId) return null;

    try {
      // 1. Fetch all topic mastery records
      const { data: masteryRecords, error: masteryErr } = await supabase
        .from('student_topic_mastery')
        .select('*')
        .eq('user_id', userId)
        .order('mastery_percentage', { ascending: false });

      if (masteryErr) throw masteryErr;

      // 2. Fetch recent quiz attempts
      const { data: quizAttempts, error: quizErr } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (quizErr) throw quizErr;

      const topics = masteryRecords || [];
      const quizzes = quizAttempts || [];

      const totalTopics = topics.length;
      const mastered = topics.filter((t) => t.mastery_percentage >= 90).length;
      const inReview = topics.filter((t) => t.mastery_percentage >= 60 && t.mastery_percentage < 90).length;
      const upNext = topics.filter((t) => t.mastery_percentage < 60).length;

      const avgMastery =
        totalTopics > 0
          ? Math.round(topics.reduce((acc, t) => acc + t.mastery_percentage, 0) / totalTopics)
          : 0;

      // Subject groupings
      const subjectMap = {};
      topics.forEach((t) => {
        const s = t.subject || 'General';
        if (!subjectMap[s]) subjectMap[s] = { total: 0, sum: 0, count: 0 };
        subjectMap[s].sum += t.mastery_percentage;
        subjectMap[s].count += 1;
      });

      const subjects = Object.entries(subjectMap).map(([name, data]) => ({
        name,
        averageMastery: Math.round(data.sum / data.count),
        topicCount: data.count,
      }));

      return {
        totalTopics,
        masteredCount: mastered,
        inReviewCount: inReview,
        upNextCount: upNext,
        averageMastery: avgMastery,
        topics,
        subjects,
        quizzes,
      };
    } catch (err) {
      console.warn('Analytics fetch error:', err);
      return null;
    }
  },
};

export default analyticsService;
