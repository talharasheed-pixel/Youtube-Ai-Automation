const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const config = require('../config');
const AuditLogger = require('./audit-logger');
const fs = require('fs');

/**
 * YouTube Service — OAuth2 flow, video upload, metadata, analytics.
 * NEVER stores Google passwords. Uses official OAuth2 only.
 */
class YouTubeService {
  constructor() {
    this.oauth2Client = null;
    if (config.youtube.clientId) {
      this.oauth2Client = new google.auth.OAuth2(
        config.youtube.clientId,
        config.youtube.clientSecret,
        config.youtube.redirectUri
      );
    }
  }

  /**
   * Generate authorization URL for YouTube OAuth
   */
  getAuthUrl() {
    if (!this.oauth2Client) throw new Error('YouTube OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      ],
      prompt: 'consent',
    });
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleCallback(code, userId) {
    if (!this.oauth2Client) throw new Error('YouTube OAuth not configured');

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Get channel info
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found for this account');

    // Store channel
    const db = getDb();
    const channelId = uuidv4();
    db.prepare(`
      INSERT INTO channels (id, user_id, youtube_channel_id, channel_name, channel_url,
        access_token_encrypted, refresh_token_encrypted, token_expiry, scopes,
        connected_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'connected')
    `).run(
      channelId, userId || 'default',
      channel.id,
      channel.snippet.title,
      `https://youtube.com/channel/${channel.id}`,
      tokens.access_token, // In production: encrypt this
      tokens.refresh_token || '', // In production: encrypt this
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      'youtube.upload,youtube,youtube.readonly,yt-analytics.readonly'
    );

    AuditLogger.log('YOUTUBE_CONNECTED', {
      channelId: channel.id, channelName: channel.snippet.title,
      entityType: 'channel', entityId: channelId,
    });

    return {
      channelId,
      youtubeChannelId: channel.id,
      channelName: channel.snippet.title,
      subscriberCount: channel.statistics?.subscriberCount,
    };
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(publishingJobId) {
    const db = getDb();
    const job = db.prepare('SELECT * FROM publishing_jobs WHERE id = ?').get(publishingJobId);
    if (!job) throw new Error('Publishing job not found');

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(job.channel_id);
    if (!channel) throw new Error('Channel not found');

    if (!this.oauth2Client) throw new Error('YouTube OAuth not configured');

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: channel.access_token_encrypted,
      refresh_token: channel.refresh_token_encrypted,
    });

    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    // Validate files
    if (!job.video_file || !fs.existsSync(job.video_file)) {
      throw new Error('Video file not found');
    }

    // Update status
    db.prepare('UPDATE publishing_jobs SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('UPLOADING', publishingJobId);

    // Upload video
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: job.title,
          description: job.description,
          tags: job.tags ? JSON.parse(job.tags) : [],
          categoryId: job.category_id || '22',
        },
        status: {
          privacyStatus: job.privacy_status || 'private',
          publishAt: job.scheduled_at || undefined,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(job.video_file),
      },
    });

    const videoId = response.data.id;

    // Upload thumbnail if available
    if (job.thumbnail_file && fs.existsSync(job.thumbnail_file)) {
      try {
        await youtube.thumbnails.set({
          videoId,
          media: {
            body: fs.createReadStream(job.thumbnail_file),
          },
        });
      } catch (e) {
        console.warn('Thumbnail upload failed:', e.message);
      }
    }

    // Update job
    db.prepare(`
      UPDATE publishing_jobs SET youtube_video_id = ?, status = 'PUBLISHED',
      published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(videoId, publishingJobId);

    AuditLogger.log('VIDEO_PUBLISHED', {
      projectId: job.project_id, youtubeVideoId: videoId,
      entityType: 'publishing_job', entityId: publishingJobId,
    });

    return { videoId, url: `https://youtube.com/watch?v=${videoId}` };
  }

  /**
   * Get connected channels
   */
  getChannels() {
    const db = getDb();
    return db.prepare('SELECT id, youtube_channel_id, channel_name, channel_url, status, connected_at FROM channels').all();
  }

  /**
   * Collect analytics for a published video
   */
  async collectAnalytics(projectId, youtubeVideoId) {
    const db = getDb();
    const channel = db.prepare('SELECT * FROM channels WHERE status = ? LIMIT 1').get('connected');
    if (!channel || !this.oauth2Client) return null;

    this.oauth2Client.setCredentials({
      access_token: channel.access_token_encrypted,
      refresh_token: channel.refresh_token_encrypted,
    });

    try {
      const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
      const response = await youtube.videos.list({
        part: 'statistics,snippet',
        id: youtubeVideoId,
      });

      const video = response.data.items?.[0];
      if (!video) return null;

      const stats = video.statistics;
      const analyticsId = uuidv4();

      db.prepare(`
        INSERT INTO analytics (id, project_id, youtube_video_id, views, likes, comments,
          collected_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        analyticsId, projectId, youtubeVideoId,
        parseInt(stats.viewCount || 0),
        parseInt(stats.likeCount || 0),
        parseInt(stats.commentCount || 0)
      );

      return {
        views: parseInt(stats.viewCount || 0),
        likes: parseInt(stats.likeCount || 0),
        comments: parseInt(stats.commentCount || 0),
      };
    } catch (error) {
      console.warn('Analytics collection failed:', error.message);
      return null;
    }
  }
}

module.exports = YouTubeService;
