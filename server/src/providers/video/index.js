const { BaseProviderAdapter } = require('../provider-router');

class RunwayAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('runway', config);
    this.endpoint = config.endpoint || 'https://api.dev.runwayml.com/v1';
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('Runway API key not configured');

    // Runway uses async generation — submit job, poll for result
    const response = await fetch(`${this.endpoint}/image_to_video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        promptImage: params.imageUrl,
        promptText: params.prompt,
        duration: params.duration || 5,
        ratio: params.ratio || '16:9',
      }),
    });

    if (!response.ok) {
      throw new Error(`Runway error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      jobId: data.id,
      status: 'PROCESSING',
      provider: 'runway',
    };
  }

  async checkStatus(jobId) {
    const response = await fetch(`${this.endpoint}/tasks/${jobId}`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
    });

    if (!response.ok) throw new Error(`Runway status check failed`);
    const data = await response.json();

    return {
      status: data.status === 'SUCCEEDED' ? 'COMPLETED' : data.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
      outputUrl: data.output?.[0],
      progress: data.progress,
    };
  }

  async cancel(jobId) {
    await fetch(`${this.endpoint}/tasks/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
    });
  }

  async retry(jobId) { /* Re-submit original params */ }

  async getResult(jobId) {
    return this.checkStatus(jobId);
  }

  isConfigured() { return !!this.config.apiKey; }
}

module.exports = { RunwayAdapter };
