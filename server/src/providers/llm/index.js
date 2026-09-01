const { BaseProviderAdapter } = require('../provider-router');

class OpenAIAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('openai', config);
    this.endpoint = config.endpoint || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4o';
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens || 4096,
        response_format: params.responseFormat || undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  async checkStatus() { return { status: 'COMPLETED' }; }
  async cancel() { }
  async retry(jobId) { return this.generate(jobId); }
  async getResult(jobId) { return jobId; }

  isConfigured() { return !!this.config.apiKey; }
}

class GeminiAdapter extends BaseProviderAdapter {
  constructor(config) {
    super('gemini', config);
    this.model = config.model || 'gemini-2.5-flash';
  }

  async generate(params, options = {}) {
    if (!this.config.apiKey) throw new Error('Gemini API key not configured');

    const model = options.model || this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    // Convert OpenAI-style messages to Gemini format
    const contents = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = params.messages.find(m => m.role === 'system');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens || 4096,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: data.usageMetadata,
      model,
      finishReason: data.candidates?.[0]?.finishReason,
    };
  }

  async checkStatus() { return { status: 'COMPLETED' }; }
  async cancel() { }
  async retry(jobId) { return this.generate(jobId); }
  async getResult(jobId) { return jobId; }

  isConfigured() { return !!this.config.apiKey; }
}

module.exports = { OpenAIAdapter, GeminiAdapter };
