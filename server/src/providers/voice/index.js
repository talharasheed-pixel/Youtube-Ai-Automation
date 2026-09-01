const { BaseProviderAdapter } = require('../provider-router');
const fs = require('fs');
const path = require('path');

class ElevenLabsAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('elevenlabs', config);
    this.endpoint = 'https://api.elevenlabs.io/v1';
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('ElevenLabs API key not configured');

    const voiceId = params.voiceId || 'pNInz6obpgDQGcFmaJgB'; // Default: Adam
    const response = await fetch(`${this.endpoint}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: params.stability ?? 0.5,
          similarity_boost: params.similarityBoost ?? 0.75,
          style: params.style ?? 0.5,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs error: ${err.detail?.message || response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const outputPath = params.outputPath || path.join(options.storageDir || '/tmp', `voice_${Date.now()}.mp3`);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, audioBuffer);

    return {
      filePath: outputPath,
      fileSize: audioBuffer.length,
      mimeType: 'audio/mpeg',
      duration: null, // Would need audio analysis
    };
  }

  async checkStatus() { return { status: 'COMPLETED' }; }
  async cancel() { }
  async retry(jobId) { return this.generate(jobId); }
  async getResult(jobId) { return jobId; }
  isConfigured() { return !!this.config.apiKey; }
}

class GoogleTTSAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('google-tts', config);
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('Google TTS API key not configured');

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: params.text },
          voice: {
            languageCode: params.language || 'en-US',
            name: params.voiceName || 'en-US-Journey-D',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: params.speed || 1.0,
            pitch: params.pitch || 0,
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`Google TTS error: ${response.statusText}`);

    const data = await response.json();
    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    const outputPath = params.outputPath || path.join(options.storageDir || '/tmp', `voice_${Date.now()}.mp3`);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, audioBuffer);

    return { filePath: outputPath, fileSize: audioBuffer.length, mimeType: 'audio/mpeg' };
  }

  async checkStatus() { return { status: 'COMPLETED' }; }
  async cancel() { }
  async retry(jobId) { return this.generate(jobId); }
  async getResult(jobId) { return jobId; }
  isConfigured() { return !!this.config.apiKey; }
}

module.exports = { ElevenLabsAdapter, GoogleTTSAdapter };
