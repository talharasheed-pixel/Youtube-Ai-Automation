const http = require('http');
const url = require('url');
const { google } = require('googleapis');
const { exec } = require('child_process');
const { initDb, getDb } = require('../src/db');
const { v4: uuidv4 } = require('uuid');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '313610939200-3ehbhrsv2qc2tthvsu4s5dtd76rlc8a2.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:3001/api/youtube/callback';

console.log('\n🎬 ========================================================');
console.log('   CONNECT YOUTUBE CHANNEL: MT\'s Markeet Place');
console.log('========================================================\n');

async function main() {
  await initDb();
  const db = getDb();

  // Check if credentials exist in database
  let clientId = CLIENT_ID;
  let clientSecret = CLIENT_SECRET;

  try {
    const row = db.prepare("SELECT * FROM system_settings WHERE key = 'youtube_oauth'").get();
    if (row && row.value) {
      const data = JSON.parse(row.value);
      clientId = data.clientId || clientId;
      clientSecret = data.clientSecret || clientSecret;
    }
  } catch(e) {}

  if (!clientSecret) {
    console.log('⚠️ Client Secret not found in environment.');
    console.log('Please pass your client secret:');
    console.log('node server/scripts/quick-connect-youtube.js <CLIENT_SECRET>\n');
    if (process.argv[2]) {
      clientSecret = process.argv[2];
    } else {
      process.exit(1);
    }
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    prompt: 'consent',
  });

  // Start local server to catch callback
  const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    if (reqUrl.pathname === '/api/youtube/callback' || reqUrl.pathname === '/api/youtube/oauth2callback' || reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.query.code;
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code received.</h1>');
        return;
      }

      try {
        console.log('🔑 Exchanging authorization code for YouTube tokens...');
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelRes = await youtube.channels.list({ part: 'snippet,statistics', mine: true });
        const channel = channelRes.data.items?.[0];

        const channelTitle = channel ? channel.snippet.title : "MT's Markeet Place";
        const channelId = channel ? channel.id : 'default_channel';

        console.log(`\n🎉 SUCCESS! Connected YouTube Channel: "${channelTitle}" (ID: ${channelId})`);

        // Save to SQLite
        const localId = uuidv4();
        db.prepare(`
          INSERT INTO channels (id, user_id, youtube_channel_id, channel_name, channel_url,
            access_token_encrypted, refresh_token_encrypted, token_expiry, scopes,
            connected_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'connected')
        `).run(
          localId, 'owner', channelId, channelTitle, `https://youtube.com/channel/${channelId}`,
          tokens.access_token, tokens.refresh_token || '',
          tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          'youtube.upload,youtube.readonly'
        );

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0b0f19; color: white;">
            <h1 style="color: #22c55e;">🎉 YouTube Channel Connected Successfully!</h1>
            <p style="font-size: 18px;">Channel: <b>${channelTitle}</b></p>
            <p style="color: #94a3b8;">You can now close this tab and return to your YouTube Automation OS.</p>
          </div>
        `);

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1500);
      } catch (err) {
        console.error('❌ Token exchange failed:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Connection Failed: ${err.message}</h1>`);
      }
    }
  });

  server.listen(3001, () => {
    console.log('⚡ Listening on http://localhost:3001/api/youtube/callback');
    console.log('\n🌐 Opening Google Authentication page in your browser...');
    console.log(`URL: ${authUrl}\n`);
    exec(`start "" "${authUrl}"`);
  });
}

main().catch(console.error);
