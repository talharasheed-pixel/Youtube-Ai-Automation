const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.example') });

// Try loading .env first, fallback to .env.example
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
} catch (e) { /* .env not required */ }

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  auth: {
    apiKey: process.env.API_KEY || 'dev-key-change-me',
  },

  providers: {
    llm: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o',
        endpoint: 'https://api.openai.com/v1',
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.5-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      },
    },
    voice: {
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        endpoint: 'https://api.elevenlabs.io/v1',
      },
      googleTts: {
        apiKey: process.env.GOOGLE_TTS_API_KEY || '',
      },
    },
    image: {
      stability: {
        apiKey: process.env.STABILITY_API_KEY || '',
        endpoint: 'https://api.stability.ai/v2beta',
      },
    },
    video: {
      runway: {
        apiKey: process.env.RUNWAY_API_KEY || '',
        endpoint: 'https://api.dev.runwayml.com/v1',
      },
    },
  },

  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI || 'https://youtube-ai-automation-h7wx.onrender.com/api/youtube/callback',
  },

  budget: {
    dailyUsd: parseFloat(process.env.DAILY_BUDGET_USD || '50'),
    projectUsd: parseFloat(process.env.PROJECT_BUDGET_USD || '100'),
    monthlyUsd: parseFloat(process.env.MONTHLY_BUDGET_USD || '500'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    maxVideoGenerations: parseInt(process.env.MAX_VIDEO_GENERATIONS || '5', 10),
  },

  paths: {
    storage: path.resolve(__dirname, '../storage'),
    db: path.resolve(__dirname, '../storage/database.sqlite'),
  },
};

module.exports = config;
