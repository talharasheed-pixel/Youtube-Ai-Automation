const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

/**
 * Task Queue — in-process job queue with priority, retries, and concurrency control.
 * Drop-in replaceable with BullMQ+Redis for production scaling.
 */
class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 3;
    this.queue = [];
    this.running = new Map();
    this.results = new Map();
    this.maxRetries = options.maxRetries || 3;
  }

  add(name, data, options = {}) {
    const job = {
      id: uuidv4(),
      name,
      data,
      priority: options.priority || 5,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: options.maxRetries || this.maxRetries,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    };

    this.queue.push(job);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.emit('job:queued', job);
    this._processNext();
    return job;
  }

  async _processNext() {
    if (this.running.size >= this.concurrency) return;
    if (this.queue.length === 0) return;

    const job = this.queue.shift();
    if (!job) return;

    job.status = 'RUNNING';
    job.startedAt = new Date().toISOString();
    this.running.set(job.id, job);
    this.emit('job:started', job);

    try {
      const handler = this.handlers?.get(job.name);
      if (!handler) throw new Error(`No handler for job type: ${job.name}`);

      const result = await handler(job.data, job);
      job.result = result;
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      this.results.set(job.id, job);
      this.emit('job:completed', job);
    } catch (error) {
      job.error = error.message;
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'RETRYING';
        this.emit('job:retrying', job);
        // Exponential backoff
        const delay = Math.pow(2, job.retryCount) * 1000;
        setTimeout(() => {
          this.queue.push(job);
          this._processNext();
        }, delay);
      } else {
        job.status = 'FAILED';
        job.completedAt = new Date().toISOString();
        this.results.set(job.id, job);
        this.emit('job:failed', job);
      }
    } finally {
      this.running.delete(job.id);
      this._processNext();
    }
  }

  registerHandler(name, handler) {
    if (!this.handlers) this.handlers = new Map();
    this.handlers.set(name, handler);
  }

  getJob(jobId) {
    const queued = this.queue.find(j => j.id === jobId);
    if (queued) return queued;
    if (this.running.has(jobId)) return this.running.get(jobId);
    return this.results.get(jobId) || null;
  }

  cancelJob(jobId) {
    const idx = this.queue.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      const job = this.queue.splice(idx, 1)[0];
      job.status = 'CANCELLED';
      this.emit('job:cancelled', job);
      return true;
    }
    return false;
  }

  getStats() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: [...this.results.values()].filter(j => j.status === 'COMPLETED').length,
      failed: [...this.results.values()].filter(j => j.status === 'FAILED').length,
    };
  }
}

module.exports = TaskQueue;
