const { getDb } = require('../db');
const AuditLogger = require('../services/audit-logger');

/**
 * Provider Router — abstract provider routing with primary/fallback chain.
 * Every provider implements: generate(), checkStatus(), cancel(), retry(), getResult()
 */
class ProviderRouter {
  constructor(providerType) {
    this.providerType = providerType; // 'llm', 'voice', 'image', 'video'
    this.providers = new Map();
  }

  /**
   * Register a provider adapter
   */
  register(name, adapter) {
    this.providers.set(name, adapter);
  }

  /**
   * Get enabled providers sorted by priority
   */
  getEnabledProviders() {
    const db = getDb();
    const configs = db.prepare(
      'SELECT * FROM provider_configurations WHERE provider_type = ? AND is_enabled = 1 ORDER BY priority ASC'
    ).all(this.providerType);

    const findAdapter = (cfgName) => {
      const lower = cfgName.toLowerCase();
      if (this.providers.has(lower)) return this.providers.get(lower);
      for (const [key, adapter] of this.providers.entries()) {
        if (lower.includes(key) || key.includes(lower)) return adapter;
      }
      return null;
    };

    const found = configs.map(cfg => ({
      name: cfg.provider_name,
      adapter: findAdapter(cfg.provider_name),
      config: cfg.config_json ? JSON.parse(cfg.config_json) : {},
    })).filter(p => p.adapter);

    if (found.length > 0) return found;

    return [...this.providers.entries()].map(([name, adapter]) => ({
      name, adapter, config: {}
    }));
  }

  isAvailable() {
    return this.providers.size > 0;
  }

  /**
   * Route a generation request through primary → fallback chain.
   */
  async generate(params, options = {}) {
    const providers = this.getEnabledProviders();
    if (providers.length === 0) {
      throw new Error(`No enabled providers for type: ${this.providerType}`);
    }

    let lastError = null;
    for (const provider of providers) {
      try {
        const result = await provider.adapter.generate(params, options);
        AuditLogger.log('PROVIDER_SUCCESS', {
          providerType: this.providerType,
          providerName: provider.name,
          entityType: 'provider',
        });
        return { ...result, provider: provider.name };
      } catch (error) {
        lastError = error;
        AuditLogger.log('PROVIDER_FAILURE', {
          providerType: this.providerType,
          providerName: provider.name,
          error: error.message,
          entityType: 'provider',
        });
        // Try next provider (fallback)
        continue;
      }
    }

    throw new Error(`All providers failed for ${this.providerType}: ${lastError?.message}`);
  }

  /**
   * Check if any provider is configured and available
   */
  isAvailable() {
    return this.getEnabledProviders().length > 0;
  }
}

/**
 * Base provider adapter — all providers must implement this interface.
 */
class BaseProviderAdapter {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  async generate(params, options = {}) {
    throw new Error('generate() must be implemented');
  }

  async checkStatus(jobId) {
    throw new Error('checkStatus() must be implemented');
  }

  async cancel(jobId) {
    throw new Error('cancel() must be implemented');
  }

  async retry(jobId) {
    throw new Error('retry() must be implemented');
  }

  async getResult(jobId) {
    throw new Error('getResult() must be implemented');
  }

  isConfigured() {
    return !!this.config.apiKey;
  }
}

module.exports = { ProviderRouter, BaseProviderAdapter };
