const { BaseProviderAdapter } = require('../provider-router');
const fs = require('fs');
const path = require('path');

class StabilityAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('stability', config);
    this.endpoint = config.endpoint || 'https://api.stability.ai/v2beta';
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('Stability AI API key not configured');

    const response = await fetch(`${this.endpoint}/stable-image/generate/sd3`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'image/*',
      },
      body: (() => {
        const form = new FormData();
        form.append('prompt', params.prompt);
        if (params.negativePrompt) form.append('negative_prompt', params.negativePrompt);
        form.append('output_format', 'png');
        form.append('aspect_ratio', params.aspectRatio || '16:9');
        return form;
      })(),
    });

    if (!response.ok) {
      throw new Error(`Stability error: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const outputPath = params.outputPath || path.join(options.storageDir || '/tmp', `image_${Date.now()}.png`);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, imageBuffer);

    return {
      filePath: outputPath,
      fileSize: imageBuffer.length,
      mimeType: 'image/png',
      resolution: params.aspectRatio || '16:9',
    };
  }

  async checkStatus() { return { status: 'COMPLETED' }; }
  async cancel() { }
  async retry(jobId) { return this.generate(jobId); }
  async getResult(jobId) { return jobId; }
  isConfigured() { return !!this.config.apiKey; }
}

class DalleAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('dalle', config);
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('OpenAI (DALL-E) API key not configured');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: params.prompt,
        n: 1,
        size: params.size || '1792x1024',
        quality: params.quality || 'hd',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`DALL-E error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
    const outputPath = params.outputPath || path.join(options.storageDir || '/tmp', `image_${Date.now()}.png`);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, imageBuffer);

    return { filePath: outputPath, fileSize: imageBuffer.length, mimeType: 'image/png', revisedPrompt: data.data[0].revised_prompt };
  }

  async checkStatus() { return { status: 'COMPLETED' }; }
  async cancel() { }
  async retry(jobId) { return this.generate(jobId); }
  async getResult(jobId) { return jobId; }
  isConfigured() { return !!this.config.apiKey; }
}

module.exports = { StabilityAdapter, DalleAdapter };
