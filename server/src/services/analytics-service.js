const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

/**
 * Analytics Service — Performance tracking and learning loop.
 */
class AnalyticsService {
  constructor(youtubeService) {
    this.youtubeService = youtubeService;
  }

  /**
   * Collect analytics for all published videos
   */
  async collectAll() {
    const db = getDb();
    const publishedJobs = db.prepare(`
      SELECT pj.*, p.id as proj_id FROM publishing_jobs pj
      JOIN projects p ON p.id = pj.project_id
      WHERE pj.status = 'PUBLISHED' AND pj.youtube_video_id IS NOT NULL
    `).all();

    for (const job of publishedJobs) {
      await this.youtubeService?.collectAnalytics(job.proj_id, job.youtube_video_id);
    }
  }

  /**
   * Generate performance insights for the learning loop
   */
  getInsights() {
    const db = getDb();
    const analytics = db.prepare(`
      SELECT a.*, p.topic, p.niche, p.overall_score, sp.recommended_title
      FROM analytics a
      JOIN projects p ON p.id = a.project_id
      LEFT JOIN seo_packages sp ON sp.project_id = p.id
      ORDER BY a.views DESC
    `).all();

    if (analytics.length === 0) return { insights: [], topPerformers: [], underperformers: [] };

    const avgViews = analytics.reduce((sum, a) => sum + a.views, 0) / analytics.length;

    return {
      insights: analytics.map(a => ({
        topic: a.topic,
        title: a.recommended_title,
        views: a.views,
        likes: a.likes,
        overallScore: a.overall_score,
        aboveAverage: a.views > avgViews,
      })),
      topPerformers: analytics.filter(a => a.views > avgViews * 1.5).map(a => a.topic),
      underperformers: analytics.filter(a => a.views < avgViews * 0.5).map(a => a.topic),
      averageViews: Math.round(avgViews),
      totalVideos: analytics.length,
    };
  }
}

module.exports = AnalyticsService;
